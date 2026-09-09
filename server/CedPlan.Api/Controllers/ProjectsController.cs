using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Application.Projects;
using CedPlan.Domain.Access;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

/// <summary>
/// HTTP surface for projects and their membership. Authorization (role lookups) stays here via
/// <see cref="IProjectAccess"/>; the actual business logic and persistence for each operation live in
/// their own use-case class under CedPlan.Application.Projects, so this controller only parses the
/// request, checks access, calls the use case, and maps the result to an HTTP response.
/// </summary>
[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAccess _access;
    private readonly ProjectQueries _queries;
    private readonly CreateProject _createProject;
    private readonly UpdateProject _updateProject;
    private readonly DeleteProject _deleteProject;
    private readonly AddProjectMember _addMember;
    private readonly UpdateProjectMemberRole _updateMemberRole;
    private readonly RemoveProjectMember _removeMember;

    public ProjectsController(
        AppDbContext db,
        IProjectAccess access,
        ProjectQueries queries,
        CreateProject createProject,
        UpdateProject updateProject,
        DeleteProject deleteProject,
        AddProjectMember addMember,
        UpdateProjectMemberRole updateMemberRole,
        RemoveProjectMember removeMember)
    {
        _db = db;
        _access = access;
        _queries = queries;
        _createProject = createProject;
        _updateProject = updateProject;
        _deleteProject = deleteProject;
        _addMember = addMember;
        _updateMemberRole = updateMemberRole;
        _removeMember = removeMember;
    }

    /// <summary>True only if the project exists AND the caller's resolved role meets the minimum — mirrors
    /// the original inline check, which reported a nonexistent project the same way as an insufficient role
    /// (Forbid), so that quirk is preserved rather than "fixed" into a 404 here.</summary>
    private async Task<bool> HasRoleAsync(Guid projectId, ProjectRole minRole)
    {
        if (!await _db.Projects.AnyAsync(p => p.Id == projectId)) return false;
        var role = await _access.GetRoleAsync(this.GetUserId(), projectId);
        return role != null && role >= minRole;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetAll()
    {
        return Ok(await _queries.ListMine(this.GetUserId()));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetOne(Guid id)
    {
        var dto = await _queries.GetOne(this.GetUserId(), id);
        if (dto == null) return NotFound();
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectDto dto)
    {
        try
        {
            var result = await _createProject.Handle(this.GetUserId(), dto);
            return CreatedAtAction(nameof(GetOne), new { id = result.Id }, result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectDto dto)
    {
        if (!await HasRoleAsync(id, ProjectRole.Admin)) return Forbid();

        await _updateProject.Handle(id, dto);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await HasRoleAsync(id, ProjectRole.Owner)) return Forbid();

        await _deleteProject.Handle(id);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<ProjectMemberDto>>> GetMembers(Guid id)
    {
        if (!await _access.IsMemberAsync(this.GetUserId(), id)) return Forbid();

        return Ok(await _queries.ListMembers(id));
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ProjectMemberDto>> AddMember(Guid id, AddMemberDto dto)
    {
        // Any Member+ can invite people to the project; the privilege-escalation cap for Admin/Owner
        // grants lives inside AddProjectMember itself.
        if (!await HasRoleAsync(id, ProjectRole.Member)) return Forbid();
        var actorRole = (await _access.GetRoleAsync(this.GetUserId(), id))!.Value;

        try
        {
            var member = await _addMember.Handle(id, this.GetUserId(), actorRole, dto);
            return Ok(member);
        }
        catch (NotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> UpdateMemberRole(Guid id, Guid memberId, UpdateMemberRoleDto dto)
    {
        if (!await HasRoleAsync(id, ProjectRole.Admin)) return Forbid();

        try
        {
            await _updateMemberRole.Handle(id, memberId, dto);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid memberId)
    {
        if (!await HasRoleAsync(id, ProjectRole.Admin)) return Forbid();

        try
        {
            await _removeMember.Handle(id, memberId);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }
}
