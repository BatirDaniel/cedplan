using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using CedPlan.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

/// <summary>
/// The global, cross-project "my calendar" — events I'm attending/created and tasks assigned to me,
/// across every project I'm a member of. Per-project access is implied by the ProjectMembers join,
/// so there's no separate role check here (unlike CalendarEventsController).
/// </summary>
[ApiController]
[Authorize]
[Route("api/calendar")]
public class CalendarController : ControllerBase
{
    private readonly AppDbContext _db;

    public CalendarController(AppDbContext db)
    {
        _db = db;
    }

    private static DateTime ToUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
    };

    [HttpGet]
    public async Task<ActionResult<CalendarFeedDto>> GetFeed([FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] string? projectIds)
    {
        if (to <= from) return BadRequest(new { message = "Intervalul de timp este invalid." });
        if ((to - from).TotalDays > 366) return BadRequest(new { message = "Intervalul solicitat este prea mare." });

        var userId = this.GetUserId();
        var fromUtc = ToUtc(from);
        var toUtc = ToUtc(to);

        var myProjectIds = await _db.ProjectMembers.Where(m => m.UserId == userId).Select(m => m.ProjectId).ToListAsync();
        var projectFilter = ParseProjectIds(projectIds);
        var scopedProjectIds = projectFilter == null ? myProjectIds : myProjectIds.Intersect(projectFilter).ToList();

        var events = await _db.CalendarEvents
            .Where(e => scopedProjectIds.Contains(e.ProjectId) && e.StartsAt < toUtc && e.EndsAt > fromUtc
                && (e.CreatedById == userId || e.Attendees.Any(a => a.UserId == userId)))
            .Include(e => e.Project).Include(e => e.WorkPackage).Include(e => e.CreatedBy)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .OrderBy(e => e.StartsAt)
            .ToListAsync();

        var fromDate = DateOnly.FromDateTime(fromUtc);
        var toDate = DateOnly.FromDateTime(toUtc);

        var tasks = await _db.WorkPackages
            .Where(w => scopedProjectIds.Contains(w.ProjectId)
                && w.Assignees.Any(a => a.UserId == userId)
                && w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected
                && ((w.StartDate != null && w.StartDate < toDate && (w.DueDate ?? w.StartDate) >= fromDate)
                    || (w.DueDate != null && w.DueDate >= fromDate && w.DueDate < toDate)))
            .Include(w => w.Project).Include(w => w.Assignees).ThenInclude(a => a.User)
            .ToListAsync();

        return Ok(new CalendarFeedDto(
            events.Select(ToEventDto).ToList(),
            tasks.Select(ToTaskDto).ToList()));
    }

    [HttpGet("backlog")]
    public async Task<ActionResult<List<CalendarTaskDto>>> GetBacklog([FromQuery] string? projectIds)
    {
        var userId = this.GetUserId();
        var myProjectIds = await _db.ProjectMembers.Where(m => m.UserId == userId).Select(m => m.ProjectId).ToListAsync();
        var projectFilter = ParseProjectIds(projectIds);
        var scopedProjectIds = projectFilter == null ? myProjectIds : myProjectIds.Intersect(projectFilter).ToList();

        var tasks = await _db.WorkPackages
            .Where(w => scopedProjectIds.Contains(w.ProjectId)
                && w.Assignees.Any(a => a.UserId == userId)
                && w.Status != WorkPackageStatus.Closed && w.Status != WorkPackageStatus.Rejected
                && w.StartDate == null && w.DueDate == null)
            .Include(w => w.Project).Include(w => w.Assignees).ThenInclude(a => a.User)
            .OrderByDescending(w => w.Priority).ThenBy(w => w.CreatedAt)
            .Take(200)
            .ToListAsync();

        return Ok(tasks.Select(ToTaskDto).ToList());
    }

    private static List<Guid>? ParseProjectIds(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? null : raw.Split(',').Select(Guid.Parse).ToList();

    private static CalendarTaskDto ToTaskDto(WorkPackage w) => new(
        w.Id, w.ProjectId, w.Project?.Name ?? "", w.Project?.Color ?? "#2563eb", w.Project?.Identifier ?? "",
        w.Sequence, w.Subject, w.Type, w.Status, w.Priority,
        w.StartDate, w.DueDate, w.EstimatedHours, w.PercentDone,
        w.Assignees.Where(a => a.User != null).Select(a => new AssigneeDto(a.UserId, a.User!.FullName, a.User.AvatarColor)).ToList());

    private static CalendarEventDto ToEventDto(CalendarEvent e) => new(
        e.Id, e.ProjectId, e.Project?.Name ?? "", e.Project?.Color ?? "#2563eb", e.Project?.Identifier ?? "",
        e.Title, e.Description, e.Location, e.MeetingUrl,
        e.Type, e.IsAllDay, e.StartsAt, e.EndsAt,
        e.WorkPackageId, e.WorkPackage?.Subject, e.Color,
        e.CreatedById, e.CreatedBy?.FullName ?? "",
        e.Attendees.Where(a => a.User != null)
            .Select(a => new CalendarAttendeeDto(a.UserId, a.User!.FullName, a.User.AvatarColor, a.Response, a.IsOptional))
            .ToList(),
        e.CreatedAt, e.UpdatedAt);
}
