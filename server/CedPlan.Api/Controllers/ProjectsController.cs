using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using CedPlan.Api.Models;
using CedPlan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;
    private readonly PermissionService _permissions;

    public ProjectsController(AppDbContext db, NotificationService notifications, PermissionService permissions)
    {
        _db = db;
        _notifications = notifications;
        _permissions = permissions;
    }

    /// <summary>Admins with projects.manage_any see every project workspace-wide; everyone else only theirs.</summary>
    private async Task<IQueryable<Project>> MyProjects()
    {
        if (await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.ProjectsManageAny))
            return _db.Projects;
        return _db.Projects.Where(p => p.Members.Any(m => m.UserId == this.GetUserId()));
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetAll()
    {
        var userId = this.GetUserId();
        var projects = await (await MyProjects())
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto(
                p.Id, p.Name, p.Identifier, p.Description, p.Color, p.IsArchived, p.CreatedAt,
                p.Members.Count,
                p.WorkPackages.Count,
                p.WorkPackages.Count(w => w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected)
            ))
            .ToListAsync();
        return Ok(projects);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetOne(Guid id)
    {
        var p = await (await MyProjects()).FirstOrDefaultAsync(p => p.Id == id);
        if (p == null) return NotFound();
        var dto = new ProjectDto(
            p.Id, p.Name, p.Identifier, p.Description, p.Color, p.IsArchived, p.CreatedAt,
            await _db.ProjectMembers.CountAsync(m => m.ProjectId == id),
            await _db.WorkPackages.CountAsync(w => w.ProjectId == id),
            await _db.WorkPackages.CountAsync(w => w.ProjectId == id && w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected));
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectDto dto)
    {
        var userId = this.GetUserId();
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Identifier))
            return BadRequest(new { message = "Numele și identificatorul sunt obligatorii." });

        var slug = dto.Identifier.Trim().ToLowerInvariant().Replace(" ", "-");
        if (await _db.Projects.AnyAsync(p => p.Identifier == slug))
            return BadRequest(new { message = "Există deja un proiect cu acest identificator." });

        var project = new Project
        {
            Name = dto.Name,
            Identifier = slug,
            Description = dto.Description,
            Color = string.IsNullOrWhiteSpace(dto.Color) ? "#2563eb" : dto.Color,
            CreatedById = userId
        };
        project.Members.Add(new ProjectMember { ProjectId = project.Id, UserId = userId, Role = ProjectRole.Owner });

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = project.Id },
            new ProjectDto(project.Id, project.Name, project.Identifier, project.Description, project.Color, project.IsArchived, project.CreatedAt, 1, 0, 0));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectDto dto)
    {
        var project = await RequireRole(id, ProjectRole.Admin);
        if (project == null) return Forbid();

        project.Name = dto.Name;
        project.Description = dto.Description;
        project.Color = dto.Color;
        project.IsArchived = dto.IsArchived;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await RequireRole(id, ProjectRole.Owner);
        if (project == null) return Forbid();

        // CalendarEvent -> Project is Cascade, but CalendarEvent -> WorkPackage is Restrict, so remove
        // events explicitly first to avoid a dangling-reference conflict while the project cascades.
        await _db.CalendarEvents.Where(e => e.ProjectId == id).ExecuteDeleteAsync();

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<ProjectMemberDto>>> GetMembers(Guid id)
    {
        if (await MyRole(id) == null) return Forbid();

        var members = await _db.ProjectMembers.Where(m => m.ProjectId == id)
            .Include(m => m.User)
            .Select(m => new ProjectMemberDto(m.Id, m.UserId, m.User!.FullName, m.User.Email!, m.User.AvatarColor, m.Role))
            .ToListAsync();
        return Ok(members);
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ProjectMemberDto>> AddMember(Guid id, AddMemberDto dto)
    {
        // Any Member+ can invite people to the project; only Admin/Owner can hand out Admin/Owner
        // access, so a plain Member inviting someone is capped at the Member role.
        var project = await RequireRole(id, ProjectRole.Member);
        if (project == null) return Forbid();

        var callerRole = await MyRole(id);
        var role = dto.Role;
        if (callerRole < ProjectRole.Admin && role >= ProjectRole.Admin)
            role = ProjectRole.Member;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null) return NotFound(new { message = "Nu există niciun utilizator cu acest email." });

        if (await _db.ProjectMembers.AnyAsync(m => m.ProjectId == id && m.UserId == user.Id))
            return BadRequest(new { message = "Utilizatorul este deja membru al proiectului." });

        var member = new ProjectMember { ProjectId = id, UserId = user.Id, Role = role };
        _db.ProjectMembers.Add(member);
        await _db.SaveChangesAsync();

        var actor = await _db.Users.FindAsync(this.GetUserId());
        await _notifications.NotifyAsync(
            user.Id, this.GetUserId(), "projectMemberChanges",
            $"{actor?.FullName} te-a adăugat în proiectul {project.Name}",
            null, id);

        return Ok(new ProjectMemberDto(member.Id, user.Id, user.FullName, user.Email!, user.AvatarColor, member.Role));
    }

    [HttpPut("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> UpdateMemberRole(Guid id, Guid memberId, UpdateMemberRoleDto dto)
    {
        var project = await RequireRole(id, ProjectRole.Admin);
        if (project == null) return Forbid();

        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == id);
        if (member == null) return NotFound();

        member.Role = dto.Role;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId)
    {
        var project = await RequireRole(id, ProjectRole.Admin);
        if (project == null) return Forbid();

        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == id);
        if (member == null) return NotFound();

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<Project?> RequireRole(Guid projectId, ProjectRole minRole)
    {
        var role = await MyRole(projectId);
        if (role == null || role < minRole) return null;
        return await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
    }

    /// <summary>
    /// The caller's role on this project. An Admin with projects.manage_any is treated as a virtual
    /// Owner/Responsible on every project, even without being added as a member.
    /// </summary>
    private async Task<ProjectRole?> MyRole(Guid projectId)
    {
        var actual = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == this.GetUserId())
            .Select(m => (ProjectRole?)m.Role)
            .FirstOrDefaultAsync();
        if (actual != null) return actual;

        if (await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.ProjectsManageAny))
            return ProjectRole.Owner;

        return null;
    }
}
