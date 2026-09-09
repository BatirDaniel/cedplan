namespace CedPlan.Infrastructure.Notifications;

public record NotificationDto(
    Guid Id, string Type, string Title, string? Body,
    Guid? ProjectId, string? ProjectName, Guid? WorkPackageId, string? WorkPackageSubject,
    Guid? ActorId, string? ActorName, string? ActorColor,
    bool IsRead, DateTime CreatedAt);
