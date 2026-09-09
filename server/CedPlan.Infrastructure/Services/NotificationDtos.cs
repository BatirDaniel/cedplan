namespace CedPlan.Infrastructure.Notifications;

public record NotificationChannels(bool InApp, bool Email, bool Push);

public record NotificationPreferencesDto(
    Dictionary<string, NotificationChannels> Types,
    string Digest, // none | daily | weekly
    bool QuietHoursEnabled,
    string? QuietHoursStart,
    string? QuietHoursEnd);

public static class NotificationTypes
{
    public static readonly string[] All =
    {
        "taskAssigned", "taskDueSoon", "taskOverdue", "mentioned", "newComment", "projectUpdate",
        "taskStatusChanged", "priorityChanged", "milestoneReached", "projectMemberChanges",
        "invitations", "systemNotifications", "eventInvitation", "eventUpdated"
    };

    public static NotificationPreferencesDto Default() => new(
        All.ToDictionary(t => t, t => new NotificationChannels(true, t is "invitations" or "systemNotifications", false)),
        "none", false, null, null);
}
