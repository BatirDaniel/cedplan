using CedPlan.Domain.Access;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Infrastructure.Access;

/// <inheritdoc cref="IProjectAccess"/>
public class ProjectAccess : IProjectAccess
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissions;

    public ProjectAccess(AppDbContext db, PermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    /// <inheritdoc/>
    public async Task<ProjectRole?> GetRoleAsync(Guid userId, Guid projectId)
    {
        var actual = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == userId)
            .Select(m => (ProjectRole?)m.Role)
            .FirstOrDefaultAsync();
        if (actual != null) return actual;

        if (await _permissions.HasPermissionAsync(userId, PermissionKeys.ProjectsManageAny))
            return ProjectRole.Owner;

        return null;
    }

    /// <inheritdoc/>
    public async Task<bool> IsMemberAsync(Guid userId, Guid projectId) => await GetRoleAsync(userId, projectId) != null;

    /// <inheritdoc/>
    public async Task<bool> CanEditAsync(Guid userId, Guid projectId) =>
        await GetRoleAsync(userId, projectId) is ProjectRole role && role >= ProjectRole.Member;
}
