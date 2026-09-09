namespace CedPlan.Domain.Enums;

/// <summary>A user's self-reported presence, shown next to their name/avatar.</summary>
public enum UserStatus
{
    Available = 0,
    Away = 1,
    Busy = 2,
    DoNotDisturb = 3,
    Offline = 4,
}

/// <summary>Workspace-wide (organization-level) role — distinct from the per-project <see cref="ProjectRole"/>.</summary>
public enum SystemRole
{
    /// <summary>Regular user: can create and join projects.</summary>
    Member = 0,
    /// <summary>Can view the Administration area (users, stats) but cannot change system settings or other users' access.</summary>
    Manager = 1,
    /// <summary>Full workspace administrator.</summary>
    Admin = 2,
}
