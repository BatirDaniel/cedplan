using CedPlan.Domain.Enums;

namespace CedPlan.Domain.Access;

/// <summary>
/// Resolves what a user is allowed to do on a given project. This is the single place that encodes the
/// "an Admin holding the workspace-wide ProjectsManageAny permission acts as a virtual Owner on every
/// project" bypass rule — previously copy-pasted as a private MyRole/IsMember/CanEdit trio inside
/// ProjectsController, WorkPackagesController, CalendarEventsController and WikiController.
/// </summary>
public interface IProjectAccess
{
    /// <summary>
    /// Returns the caller's effective role on the project, or null if they have no access at all
    /// (not a member, and not covered by the ProjectsManageAny bypass).
    /// </summary>
    Task<ProjectRole?> GetRoleAsync(Guid userId, Guid projectId);

    /// <summary>True if the caller can see the project's content (any resolvable role, including Viewer).</summary>
    Task<bool> IsMemberAsync(Guid userId, Guid projectId);

    /// <summary>True if the caller can create/modify content in the project (role &gt;= Member — Viewers are read-only).</summary>
    Task<bool> CanEditAsync(Guid userId, Guid projectId);
}
