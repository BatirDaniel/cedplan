namespace CedPlan.Api.Models;

public class Permission
{
    public string Key { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class RolePermission
{
    public SystemRole Role { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public Permission? Permission { get; set; }
}

public static class PermissionKeys
{
    public const string AdminView = "admin.view";
    public const string UsersView = "users.view";
    public const string UsersManageRoles = "users.manage_roles";
    public const string UsersDeactivate = "users.deactivate";
    public const string UsersDelete = "users.delete";
    public const string ProjectsDeleteAny = "projects.delete_any";
    public const string ProjectsManageAny = "projects.manage_any";
    public const string WorkspaceSettingsManage = "workspace.manage_settings";

    public static readonly (string Key, string Category, string Description)[] All =
    {
        (AdminView, "Administration", "View the Administration area and workspace statistics"),
        (UsersView, "Users", "View the full list of workspace users"),
        (UsersManageRoles, "Users", "Change a user's workspace role (Member/Manager/Admin)"),
        (UsersDeactivate, "Users", "Deactivate a user's account"),
        (UsersDelete, "Users", "Permanently delete a user's account"),
        (ProjectsDeleteAny, "Projects", "Delete any project, including ones not owned by the caller"),
        (ProjectsManageAny, "Projects", "View and manage every project, task and wiki page workspace-wide, even without being added as a member"),
        (WorkspaceSettingsManage, "Workspace", "Manage workspace-wide settings"),
    };

    public static readonly Dictionary<SystemRole, string[]> Defaults = new()
    {
        [SystemRole.Member] = Array.Empty<string>(),
        [SystemRole.Manager] = new[] { AdminView, UsersView },
        [SystemRole.Admin] = new[]
        {
            AdminView, UsersView, UsersManageRoles, UsersDeactivate, UsersDelete,
            ProjectsDeleteAny, ProjectsManageAny, WorkspaceSettingsManage,
        },
    };
}
