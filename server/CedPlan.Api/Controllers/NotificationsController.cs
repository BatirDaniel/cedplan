using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    private static NotificationDto ToDto(Models.Notification n) => new(
        n.Id, n.Type, n.Title, n.Body,
        n.ProjectId, n.Project?.Name, n.WorkPackageId, n.WorkPackage?.Subject,
        n.ActorId, n.Actor?.FullName, n.Actor?.AvatarColor,
        n.IsRead, n.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetAll([FromQuery] int take = 30)
    {
        var userId = this.GetUserId();
        var items = await _db.Notifications
            .Where(n => n.RecipientId == userId)
            .Include(n => n.Actor)
            .Include(n => n.Project)
            .Include(n => n.WorkPackage)
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .ToListAsync();

        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount()
    {
        var userId = this.GetUserId();
        var count = await _db.Notifications.CountAsync(n => n.RecipientId == userId && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = this.GetUserId();
        var notification = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.RecipientId == userId);
        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = this.GetUserId();
        var unread = await _db.Notifications.Where(n => n.RecipientId == userId && !n.IsRead).ToListAsync();
        foreach (var n in unread) n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
