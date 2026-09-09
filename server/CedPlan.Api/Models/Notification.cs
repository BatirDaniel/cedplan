namespace CedPlan.Api.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RecipientId { get; set; }
    public ApplicationUser? Recipient { get; set; }

    public Guid? ActorId { get; set; }
    public ApplicationUser? Actor { get; set; }

    /// <summary>One of the keys in NotificationTypes.All (e.g. "taskAssigned", "mentioned", "newComment").</summary>
    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid? WorkPackageId { get; set; }
    public WorkPackage? WorkPackage { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
