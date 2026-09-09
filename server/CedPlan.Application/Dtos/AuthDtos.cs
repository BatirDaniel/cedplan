using CedPlan.Domain.Enums;

namespace CedPlan.Application.Dtos;

public record RegisterDto(string FullName, string Email, string Password);
public record LoginDto(string Email, string Password);
public record AuthResponseDto(string Token, UserDto User);

public record UserDto(
    Guid Id, string FullName, string? FirstName, string? LastName, string? DisplayName, string Email,
    string? Phone, string? JobTitle, string? Department, string? Location, string? Bio, string AvatarColor,
    UserStatus Status, string? StatusMessage,
    string PreferredLanguage, string Theme, string Timezone, string DateFormat, string TimeFormat, int FirstDayOfWeek,
    string DefaultView, bool ShowCompletedTasks, bool ConfirmBeforeDelete, bool AutoFollowCreatedTasks, bool AutoFollowAssignedTasks,
    string DefaultCalendarView, int DefaultEventDurationMinutes,
    SystemRole Role, bool IsAdmin);

public record UpdateProfileDto(
    string FullName, string? FirstName, string? LastName, string? DisplayName, string? Phone, string? JobTitle,
    string? Department, string? Location, string? Bio, string AvatarColor, UserStatus Status, string? StatusMessage);

public record UpdatePreferencesDto(
    string PreferredLanguage, string Theme, string Timezone, string DateFormat, string TimeFormat, int FirstDayOfWeek,
    string DefaultView, bool ShowCompletedTasks, bool ConfirmBeforeDelete, bool AutoFollowCreatedTasks, bool AutoFollowAssignedTasks,
    string DefaultCalendarView, int DefaultEventDurationMinutes);

public record UpdateWorkingHoursDto(string WorkingDays, string WorkStartTime, string WorkEndTime, string? WorkBreakStart, string? WorkBreakEnd);

public record ChangePasswordDto(string CurrentPassword, string NewPassword);

public record UserSessionDto(Guid Id, string? Browser, string? OperatingSystem, string? Device, string? IpAddress, DateTime CreatedAt, DateTime LastActiveAt, bool IsCurrent);

public record UpdateSystemRoleDto(SystemRole Role);
