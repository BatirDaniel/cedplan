namespace CedPlan.Domain.Enums;

public enum WorkPackageType
{
    Task = 0,
    Bug = 1,
    Feature = 2,
    Milestone = 3,
    Epic = 4
}

public enum WorkPackageStatus
{
    New = 0,
    InProgress = 1,
    InReview = 2,
    OnHold = 3,
    Closed = 4,
    Rejected = 5
}

public enum WorkPackagePriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Immediate = 3
}
