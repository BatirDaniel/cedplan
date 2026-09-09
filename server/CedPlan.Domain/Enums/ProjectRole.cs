namespace CedPlan.Domain.Enums;

/// <summary>A user's authorization level on a specific project — ordinal-comparable (Owner is the highest).</summary>
public enum ProjectRole
{
    Viewer = 0,
    Member = 1,
    Admin = 2,
    Owner = 3
}
