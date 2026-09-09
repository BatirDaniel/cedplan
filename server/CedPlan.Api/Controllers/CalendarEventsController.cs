using CedPlan.Domain.Access;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/events")]
public class CalendarEventsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IProjectAccess _access;
    private readonly NotificationService _notifications;

    public CalendarEventsController(AppDbContext db, IProjectAccess access, NotificationService notifications)
    {
        _db = db;
        _access = access;
        _notifications = notifications;
    }

    private Task<bool> IsMember(Guid projectId) => _access.IsMemberAsync(this.GetUserId(), projectId);

    private Task<bool> CanEdit(Guid projectId) => _access.CanEditAsync(this.GetUserId(), projectId);

    /// <summary>Members may edit only events they created; Admin/Responsible may edit anyone's.</summary>
    private async Task<bool> CanMutate(Guid projectId, CalendarEvent ev)
    {
        var role = await _access.GetRoleAsync(this.GetUserId(), projectId);
        if (role is null || role < ProjectRole.Member) return false;
        return ev.CreatedById == this.GetUserId() || role >= ProjectRole.Admin;
    }

    private static DateTime ToUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
    };

    private static CalendarEventDto ToDto(CalendarEvent e) => new(
        e.Id, e.ProjectId, e.Project?.Name ?? "", e.Project?.Color ?? "#2563eb", e.Project?.Identifier ?? "",
        e.Title, e.Description, e.Location, e.MeetingUrl,
        e.Type, e.IsAllDay, e.StartsAt, e.EndsAt,
        e.WorkPackageId, e.WorkPackage?.Subject, e.Color,
        e.CreatedById, e.CreatedBy?.FullName ?? "",
        e.Attendees.Where(a => a.User != null)
            .Select(a => new CalendarAttendeeDto(a.UserId, a.User!.FullName, a.User.AvatarColor, a.Response, a.IsOptional))
            .ToList(),
        e.CreatedAt, e.UpdatedAt);

    [HttpGet]
    public async Task<ActionResult<List<CalendarEventDto>>> GetAll(Guid projectId, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        if (!await IsMember(projectId)) return Forbid();
        if (to <= from) return BadRequest(new { message = "Intervalul de timp este invalid." });
        if ((to - from).TotalDays > 366) return BadRequest(new { message = "Intervalul solicitat este prea mare." });

        var fromUtc = ToUtc(from);
        var toUtc = ToUtc(to);

        var events = await _db.CalendarEvents
            .Where(e => e.ProjectId == projectId && e.StartsAt < toUtc && e.EndsAt > fromUtc)
            .Include(e => e.Project).Include(e => e.WorkPackage).Include(e => e.CreatedBy)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .OrderBy(e => e.StartsAt)
            .ToListAsync();

        return Ok(events.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CalendarEventDto>> GetOne(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var ev = await _db.CalendarEvents
            .Include(e => e.Project).Include(e => e.WorkPackage).Include(e => e.CreatedBy)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.ProjectId == projectId);
        if (ev == null) return NotFound();
        return Ok(ToDto(ev));
    }

    [HttpPost]
    public async Task<ActionResult<CalendarEventDto>> Create(Guid projectId, CreateCalendarEventDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Titlul este obligatoriu." });

        var (startsAt, endsAt) = NormalizeRange(dto.IsAllDay, dto.StartsAt, dto.EndsAt);
        if (endsAt <= startsAt) return BadRequest(new { message = "Ora de sfârșit trebuie să fie după ora de început." });

        Guid? workPackageId = dto.WorkPackageId;
        if (workPackageId != null && !await _db.WorkPackages.AnyAsync(w => w.Id == workPackageId && w.ProjectId == projectId))
            workPackageId = null;

        var attendeeIds = await FilterToProjectMembers(projectId, dto.AttendeeIds);

        var userId = this.GetUserId();
        var ev = new CalendarEvent
        {
            ProjectId = projectId,
            Title = dto.Title,
            Description = dto.Description,
            Location = dto.Location,
            MeetingUrl = dto.MeetingUrl,
            Type = dto.Type,
            IsAllDay = dto.IsAllDay,
            StartsAt = startsAt,
            EndsAt = endsAt,
            WorkPackageId = workPackageId,
            Color = dto.Color,
            CreatedById = userId,
        };
        foreach (var attendeeId in attendeeIds)
            ev.Attendees.Add(new CalendarEventAttendee { UserId = attendeeId });

        _db.CalendarEvents.Add(ev);
        await _db.SaveChangesAsync();

        await _db.Entry(ev).Reference(e => e.Project).LoadAsync();
        await _db.Entry(ev).Reference(e => e.CreatedBy).LoadAsync();
        if (ev.WorkPackageId != null) await _db.Entry(ev).Reference(e => e.WorkPackage).LoadAsync();
        await _db.Entry(ev).Collection(e => e.Attendees).Query().Include(a => a.User).LoadAsync();

        if (attendeeIds.Count > 0)
        {
            await _notifications.NotifyManyAsync(
                attendeeIds, userId, "eventInvitation",
                $"{ev.CreatedBy?.FullName} te-a invitat la „{ev.Title}”",
                ev.IsAllDay ? null : $"{ev.StartsAt:dd MMM, HH:mm}", projectId, ev.WorkPackageId);
        }

        return CreatedAtAction(nameof(GetOne), new { projectId, id = ev.Id }, ToDto(ev));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CalendarEventDto>> Update(Guid projectId, Guid id, UpdateCalendarEventDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Titlul este obligatoriu." });

        var ev = await _db.CalendarEvents
            .Include(e => e.Attendees)
            .FirstOrDefaultAsync(e => e.Id == id && e.ProjectId == projectId);
        if (ev == null) return NotFound();
        if (!await CanMutate(projectId, ev)) return Forbid();

        var (startsAt, endsAt) = NormalizeRange(dto.IsAllDay, dto.StartsAt, dto.EndsAt);
        if (endsAt <= startsAt) return BadRequest(new { message = "Ora de sfârșit trebuie să fie după ora de început." });

        var timeChanged = ev.StartsAt != startsAt || ev.EndsAt != endsAt;
        var previousAttendeeIds = ev.Attendees.Select(a => a.UserId).ToHashSet();

        Guid? workPackageId = dto.WorkPackageId;
        if (workPackageId != null && !await _db.WorkPackages.AnyAsync(w => w.Id == workPackageId && w.ProjectId == projectId))
            workPackageId = null;

        var attendeeIds = await FilterToProjectMembers(projectId, dto.AttendeeIds);

        ev.Title = dto.Title;
        ev.Description = dto.Description;
        ev.Location = dto.Location;
        ev.MeetingUrl = dto.MeetingUrl;
        ev.Type = dto.Type;
        ev.IsAllDay = dto.IsAllDay;
        ev.StartsAt = startsAt;
        ev.EndsAt = endsAt;
        ev.WorkPackageId = workPackageId;
        ev.Color = dto.Color;
        ev.UpdatedAt = DateTime.UtcNow;

        _db.CalendarEventAttendees.RemoveRange(ev.Attendees);
        foreach (var attendeeId in attendeeIds)
            ev.Attendees.Add(new CalendarEventAttendee { UserId = attendeeId });

        await _db.SaveChangesAsync();

        await _db.Entry(ev).Reference(e => e.Project).LoadAsync();
        await _db.Entry(ev).Reference(e => e.CreatedBy).LoadAsync();
        ev.WorkPackage = null;
        if (ev.WorkPackageId != null) await _db.Entry(ev).Reference(e => e.WorkPackage).LoadAsync();
        ev.Attendees = await _db.CalendarEventAttendees.Where(a => a.CalendarEventId == ev.Id).Include(a => a.User).ToListAsync();

        var userId = this.GetUserId();
        var newAttendeeIds = attendeeIds.Where(a => !previousAttendeeIds.Contains(a)).ToList();
        if (newAttendeeIds.Count > 0)
        {
            await _notifications.NotifyManyAsync(
                newAttendeeIds, userId, "eventInvitation",
                $"{ev.CreatedBy?.FullName} te-a invitat la „{ev.Title}”",
                ev.IsAllDay ? null : $"{ev.StartsAt:dd MMM, HH:mm}", projectId, ev.WorkPackageId);
        }
        if (timeChanged)
        {
            var others = attendeeIds.Where(a => previousAttendeeIds.Contains(a));
            await _notifications.NotifyManyAsync(
                others, userId, "eventUpdated",
                $"Întâlnirea „{ev.Title}” a fost reprogramată",
                ev.IsAllDay ? null : $"{ev.StartsAt:dd MMM, HH:mm}", projectId, ev.WorkPackageId);
        }

        return Ok(ToDto(ev));
    }

    [HttpPatch("{id:guid}/reschedule")]
    public async Task<ActionResult<CalendarEventDto>> Reschedule(Guid projectId, Guid id, RescheduleCalendarEventDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var ev = await _db.CalendarEvents
            .Include(e => e.Project).Include(e => e.WorkPackage).Include(e => e.CreatedBy)
            .Include(e => e.Attendees).ThenInclude(a => a.User)
            .FirstOrDefaultAsync(e => e.Id == id && e.ProjectId == projectId);
        if (ev == null) return NotFound();
        if (!await CanMutate(projectId, ev)) return Forbid();

        var (startsAt, endsAt) = NormalizeRange(ev.IsAllDay, dto.StartsAt, dto.EndsAt);
        if (endsAt <= startsAt) return BadRequest(new { message = "Ora de sfârșit trebuie să fie după ora de început." });

        ev.StartsAt = startsAt;
        ev.EndsAt = endsAt;
        ev.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var attendeeIds = ev.Attendees.Select(a => a.UserId).ToList();
        if (attendeeIds.Count > 0)
        {
            await _notifications.NotifyManyAsync(
                attendeeIds, this.GetUserId(), "eventUpdated",
                $"Întâlnirea „{ev.Title}” a fost reprogramată",
                ev.IsAllDay ? null : $"{ev.StartsAt:dd MMM, HH:mm}", projectId, ev.WorkPackageId);
        }

        return Ok(ToDto(ev));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var ev = await _db.CalendarEvents.Include(e => e.Attendees).FirstOrDefaultAsync(e => e.Id == id && e.ProjectId == projectId);
        if (ev == null) return NotFound();
        if (!await CanMutate(projectId, ev)) return Forbid();

        var recipients = ev.Attendees.Select(a => a.UserId).ToList();
        var title = ev.Title;

        _db.CalendarEvents.Remove(ev);
        await _db.SaveChangesAsync();

        if (recipients.Count > 0)
            await _notifications.NotifyManyAsync(recipients, this.GetUserId(), "eventUpdated", $"Întâlnirea „{title}” a fost anulată", null, projectId);

        return NoContent();
    }

    [HttpPost("{id:guid}/respond")]
    public async Task<IActionResult> Respond(Guid projectId, Guid id, RespondToEventDto dto)
    {
        if (!await IsMember(projectId)) return Forbid();
        var userId = this.GetUserId();
        var attendee = await _db.CalendarEventAttendees
            .FirstOrDefaultAsync(a => a.CalendarEventId == id && a.UserId == userId);
        if (attendee == null) return Forbid();

        attendee.Response = dto.Response;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static (DateTime StartsAt, DateTime EndsAt) NormalizeRange(bool isAllDay, DateTime start, DateTime end)
    {
        var startsAt = ToUtc(start);
        var endsAt = ToUtc(end);
        if (!isAllDay) return (startsAt, endsAt);

        var startDate = DateTime.SpecifyKind(startsAt.Date, DateTimeKind.Utc);
        var endDate = DateTime.SpecifyKind(endsAt.Date, DateTimeKind.Utc);
        if (endDate <= startDate) endDate = startDate.AddDays(1);
        return (startDate, endDate);
    }

    private async Task<List<Guid>> FilterToProjectMembers(Guid projectId, List<Guid>? attendeeIds)
    {
        if (attendeeIds == null || attendeeIds.Count == 0) return new List<Guid>();
        var memberIds = await _db.ProjectMembers.Where(m => m.ProjectId == projectId).Select(m => m.UserId).ToListAsync();
        return attendeeIds.Distinct().Where(id => memberIds.Contains(id)).ToList();
    }
}
