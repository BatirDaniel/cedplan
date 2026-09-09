using CedPlan.Application.Dtos;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>
/// Read-side operations for projects. Kept separate from the write-side commands below since they need
/// no business-rule enforcement, only the "which projects can this user see" visibility rule shared by
/// list and detail.
/// </summary>
public class ProjectQueries
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissions;

    public ProjectQueries(AppDbContext db, PermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    /// <summary>Admins holding projects.manage_any see every project workspace-wide; everyone else only theirs.</summary>
    private async Task<IQueryable<Project>> VisibleProjects(Guid userId)
    {
        if (await _permissions.HasPermissionAsync(userId, PermissionKeys.ProjectsManageAny))
            return _db.Projects;
        return _db.Projects.Where(p => p.Members.Any(m => m.UserId == userId));
    }

    /// <summary>Lists every project the caller can see, alphabetically, with member/task counts.</summary>
    public async Task<List<ProjectDto>> ListMine(Guid userId)
    {
        var projects = (await VisibleProjects(userId));
        return await projects
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto(
                p.Id, p.Name, p.Identifier, p.Description, p.Color, p.IsArchived, p.CreatedAt,
                p.Members.Count,
                p.WorkPackages.Count,
                p.WorkPackages.Count(w => w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected)
            ))
            .ToListAsync();
    }

    /// <summary>Returns one project's summary, or null if it doesn't exist or the caller can't see it.</summary>
    public async Task<ProjectDto?> GetOne(Guid userId, Guid projectId)
    {
        var visible = await VisibleProjects(userId);
        var p = await visible.FirstOrDefaultAsync(p => p.Id == projectId);
        if (p == null) return null;

        return new ProjectDto(
            p.Id, p.Name, p.Identifier, p.Description, p.Color, p.IsArchived, p.CreatedAt,
            await _db.ProjectMembers.CountAsync(m => m.ProjectId == projectId),
            await _db.WorkPackages.CountAsync(w => w.ProjectId == projectId),
            await _db.WorkPackages.CountAsync(w => w.ProjectId == projectId && w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected));
    }

    /// <summary>Lists a project's members. Caller's read access must already be checked by the controller.</summary>
    public async Task<List<ProjectMemberDto>> ListMembers(Guid projectId)
    {
        return await _db.ProjectMembers.Where(m => m.ProjectId == projectId)
            .Include(m => m.User)
            .Select(m => new ProjectMemberDto(m.Id, m.UserId, m.User!.FullName, m.User.Email!, m.User.AvatarColor, m.Role))
            .ToListAsync();
    }
}
