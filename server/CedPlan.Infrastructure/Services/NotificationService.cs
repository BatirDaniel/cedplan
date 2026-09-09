using System.Text.Json;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Notifications;
using CedPlan.Infrastructure.Hubs;
using CedPlan.Infrastructure.Persistence.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Infrastructure.Services;

public class NotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationsHub> _hub;

    public NotificationService(AppDbContext db, IHubContext<NotificationsHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    /// <summary>Creates a notification for one recipient (unless they muted this type, or they're the actor) and pushes it live.</summary>
    public async Task NotifyAsync(
        Guid recipientId, Guid? actorId, string type, string title, string? body,
        Guid? projectId = null, Guid? workPackageId = null)
    {
        if (actorId.HasValue && actorId.Value == recipientId) return;

        var recipient = await _db.Users.FindAsync(recipientId);
        if (recipient == null) return;
        if (!IsInAppEnabled(recipient.NotificationPreferencesJson, type)) return;

        var notification = new Notification
        {
            RecipientId = recipientId,
            ActorId = actorId,
            Type = type,
            Title = title,
            Body = body,
            ProjectId = projectId,
            WorkPackageId = workPackageId,
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        var actor = actorId.HasValue ? await _db.Users.FindAsync(actorId.Value) : null;
        var project = projectId.HasValue ? await _db.Projects.FindAsync(projectId.Value) : null;
        var workPackage = workPackageId.HasValue ? await _db.WorkPackages.FindAsync(workPackageId.Value) : null;

        var dto = new NotificationDto(
            notification.Id, notification.Type, notification.Title, notification.Body,
            projectId, project?.Name, workPackageId, workPackage?.Subject,
            actorId, actor?.FullName, actor?.AvatarColor,
            notification.IsRead, notification.CreatedAt);

        await _hub.Clients.Group(NotificationsHub.GroupName(recipientId)).SendAsync("ReceiveNotification", dto);
    }

    /// <summary>Notifies many recipients at once, de-duplicated, skipping the actor.</summary>
    public async Task NotifyManyAsync(
        IEnumerable<Guid> recipientIds, Guid? actorId, string type, string title, string? body,
        Guid? projectId = null, Guid? workPackageId = null)
    {
        foreach (var id in recipientIds.Distinct())
        {
            await NotifyAsync(id, actorId, type, title, body, projectId, workPackageId);
        }
    }

    private static bool IsInAppEnabled(string preferencesJson, string type)
    {
        try
        {
            var prefs = JsonSerializer.Deserialize<NotificationPreferencesDto>(preferencesJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (prefs == null) return true;
            if (prefs.Types.TryGetValue(type, out var channels)) return channels.InApp;
            return true;
        }
        catch
        {
            return true;
        }
    }
}
