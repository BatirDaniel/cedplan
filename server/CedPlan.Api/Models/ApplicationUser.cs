using Microsoft.AspNetCore.Identity;

namespace CedPlan.Api.Models;

public enum UserStatus
{
    Available = 0,
    Away = 1,
    Busy = 2,
    DoNotDisturb = 3,
    Offline = 4,
}

/// <summary>Workspace-wide (organization-level) role — distinct from the per-project ProjectRole.</summary>
public enum SystemRole
{
    /// <summary>Regular user: can create and join projects.</summary>
    Member = 0,
    /// <summary>Can view the Administration area (users, stats) but cannot change system settings or other users' access.</summary>
    Manager = 1,
    /// <summary>Full workspace administrator.</summary>
    Admin = 2,
}

public class ApplicationUser : IdentityUser<Guid>
{
    // Identity
    public string FullName { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? DisplayName { get; set; }
    public string AvatarColor { get; set; } = "#2563eb";
    public string? Phone { get; set; }
    public string? JobTitle { get; set; }
    public string? Department { get; set; }
    public string? Location { get; set; }
    public string? Bio { get; set; }

    // Status
    public UserStatus Status { get; set; } = UserStatus.Available;
    public string? StatusMessage { get; set; }

    // Preferences
    public string PreferredLanguage { get; set; } = "en";
    public string Theme { get; set; } = "system"; // light | dark | system
    public string Timezone { get; set; } = "UTC";
    public string DateFormat { get; set; } = "MM/dd/yyyy";
    public string TimeFormat { get; set; } = "24h"; // 12h | 24h
    public int FirstDayOfWeek { get; set; } = 1; // 0=Sunday .. 6=Saturday
    public string DefaultView { get; set; } = "list"; // list | board | gantt
    public bool ShowCompletedTasks { get; set; } = true;
    public bool ConfirmBeforeDelete { get; set; } = true;
    public bool AutoFollowCreatedTasks { get; set; } = true;
    public bool AutoFollowAssignedTasks { get; set; } = true;
    public string DefaultCalendarView { get; set; } = "month"; // month | week | day
    public int DefaultEventDurationMinutes { get; set; } = 60;

    // Notifications — serialized NotificationPreferences JSON (per-type channel matrix + digest)
    public string NotificationPreferencesJson { get; set; } = "{}";

    // Working hours
    public string WorkingDays { get; set; } = "1,2,3,4,5"; // 0=Sunday..6=Saturday
    public string WorkStartTime { get; set; } = "09:00";
    public string WorkEndTime { get; set; } = "17:00";
    public string? WorkBreakStart { get; set; }
    public string? WorkBreakEnd { get; set; }

    // Account
    public SystemRole Role { get; set; } = SystemRole.Member;
    /// <summary>Kept in sync with <see cref="Role"/> (true only when Role == Admin) for backward compatibility.</summary>
    public bool IsAdmin { get; set; }
    public bool IsDeactivated { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
