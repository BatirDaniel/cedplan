using CedPlan.Domain.Enums;

namespace CedPlan.Application.Dtos;

public record CalendarAttendeeDto(Guid UserId, string FullName, string AvatarColor, AttendeeResponse Response, bool IsOptional);

public record CalendarEventDto(
    Guid Id, Guid ProjectId, string ProjectName, string ProjectColor, string ProjectIdentifier,
    string Title, string? Description, string? Location, string? MeetingUrl,
    CalendarEventType Type, bool IsAllDay, DateTime StartsAt, DateTime EndsAt,
    Guid? WorkPackageId, string? WorkPackageSubject, string? Color,
    Guid CreatedById, string CreatedByName,
    List<CalendarAttendeeDto> Attendees, DateTime CreatedAt, DateTime UpdatedAt);

public record CreateCalendarEventDto(
    string Title, string? Description, string? Location, string? MeetingUrl,
    CalendarEventType Type, bool IsAllDay, DateTime StartsAt, DateTime EndsAt,
    Guid? WorkPackageId, string? Color, List<Guid>? AttendeeIds);

public record UpdateCalendarEventDto(
    string Title, string? Description, string? Location, string? MeetingUrl,
    CalendarEventType Type, bool IsAllDay, DateTime StartsAt, DateTime EndsAt,
    Guid? WorkPackageId, string? Color, List<Guid>? AttendeeIds);

public record RespondToEventDto(AttendeeResponse Response);

public record RescheduleCalendarEventDto(DateTime StartsAt, DateTime EndsAt);

/// <summary>A task flattened for the calendar/backlog views — carries its project so the global view can show/color it.</summary>
public record CalendarTaskDto(
    Guid Id, Guid ProjectId, string ProjectName, string ProjectColor, string ProjectIdentifier,
    int Sequence, string Subject, WorkPackageType Type, WorkPackageStatus Status, WorkPackagePriority Priority,
    DateOnly? StartDate, DateOnly? DueDate, double? EstimatedHours, int PercentDone,
    List<AssigneeDto> Assignees);

public record CalendarFeedDto(List<CalendarEventDto> Events, List<CalendarTaskDto> Tasks);
