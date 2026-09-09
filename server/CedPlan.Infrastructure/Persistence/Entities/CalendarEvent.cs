using CedPlan.Domain.Enums;

namespace CedPlan.Infrastructure.Persistence.Entities;

public class CalendarEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Location { get; set; }
    public string? MeetingUrl { get; set; }

    public CalendarEventType Type { get; set; } = CalendarEventType.Meeting;

    /// <summary>All-day events store 00:00:00 UTC boundaries and are rendered date-only.</summary>
    public bool IsAllDay { get; set; }

    /// <summary>UTC, inclusive.</summary>
    public DateTime StartsAt { get; set; }
    /// <summary>UTC, EXCLUSIVE. A 10:00-11:00 meeting ends at 11:00; an all-day event on Mar 5 ends 2026-03-06T00:00Z.</summary>
    public DateTime EndsAt { get; set; }

    /// <summary>Optional link to the task this meeting is about.</summary>
    public Guid? WorkPackageId { get; set; }
    public WorkPackage? WorkPackage { get; set; }

    /// <summary>Optional hex override; falls back to the project color on the client.</summary>
    public string? Color { get; set; }

    public Guid CreatedById { get; set; }
    public ApplicationUser? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CalendarEventAttendee> Attendees { get; set; } = new List<CalendarEventAttendee>();
}

public class CalendarEventAttendee
{
    public Guid CalendarEventId { get; set; }
    public CalendarEvent? CalendarEvent { get; set; }
    public Guid UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public AttendeeResponse Response { get; set; } = AttendeeResponse.NoResponse;
    public bool IsOptional { get; set; }
}
