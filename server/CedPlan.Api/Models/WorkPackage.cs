namespace CedPlan.Api.Models;

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

public class WorkPackage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    /// <summary>Per-project sequential number (1, 2, 3...) used to build the short ticket key, e.g. "PLT-142".</summary>
    public int Sequence { get; set; }

    public string Subject { get; set; } = string.Empty;
    public string? Description { get; set; }

    public WorkPackageType Type { get; set; } = WorkPackageType.Task;
    public WorkPackageStatus Status { get; set; } = WorkPackageStatus.New;
    public WorkPackagePriority Priority { get; set; } = WorkPackagePriority.Normal;

    public Guid? ParentId { get; set; }
    public WorkPackage? Parent { get; set; }
    public ICollection<WorkPackage> Children { get; set; } = new List<WorkPackage>();

    public Guid AuthorId { get; set; }
    public ApplicationUser? Author { get; set; }
    public ICollection<WorkPackageAssignee> Assignees { get; set; } = new List<WorkPackageAssignee>();

    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public double? EstimatedHours { get; set; }
    public int PercentDone { get; set; }

    public double Position { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}

public class WorkPackageAssignee
{
    public Guid WorkPackageId { get; set; }
    public WorkPackage? WorkPackage { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
}

public class Comment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkPackageId { get; set; }
    public WorkPackage? WorkPackage { get; set; }
    public Guid AuthorId { get; set; }
    public ApplicationUser? Author { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    /// <summary>Comma-separated user ids mentioned ("tagged") in this message.</summary>
    public string? MentionedUserIds { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class TimeEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkPackageId { get; set; }
    public WorkPackage? WorkPackage { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public double Hours { get; set; }
    public DateOnly SpentOn { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
