using System.Text.Json;
using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using CedPlan.Api.Models;
using CedPlan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly PermissionService _permissions;
    private static readonly HashSet<string> SupportedLanguages = new() { "en", "it", "ro", "ru" };
    private static readonly HashSet<string> SupportedThemes = new() { "light", "dark", "system" };

    public UsersController(AppDbContext db, UserManager<ApplicationUser> userManager, PermissionService permissions)
    {
        _db = db;
        _userManager = userManager;
        _permissions = permissions;
    }

    private static Dtos.UserDto ToDto(ApplicationUser u) => new(
        u.Id, u.FullName, u.FirstName, u.LastName, u.DisplayName, u.Email!, u.Phone, u.JobTitle, u.Department,
        u.Location, u.Bio, u.AvatarColor, u.Status, u.StatusMessage, u.PreferredLanguage, u.Theme, u.Timezone,
        u.DateFormat, u.TimeFormat, u.FirstDayOfWeek, u.DefaultView, u.ShowCompletedTasks, u.ConfirmBeforeDelete,
        u.AutoFollowCreatedTasks, u.AutoFollowAssignedTasks, u.DefaultCalendarView, u.DefaultEventDurationMinutes,
        u.Role, u.IsAdmin);

    private async Task<ApplicationUser> RequireUser() => (await _db.Users.FindAsync(this.GetUserId()))!;

    [HttpGet("me")]
    public async Task<ActionResult<Dtos.UserDto>> Me()
    {
        var user = await _db.Users.FindAsync(this.GetUserId());
        if (user == null) return NotFound();
        return Ok(ToDto(user));
    }

    [HttpPut("me/profile")]
    public async Task<ActionResult<Dtos.UserDto>> UpdateProfile(UpdateProfileDto dto)
    {
        var user = await RequireUser();
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Name is required." });

        user.FullName = dto.FullName;
        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.DisplayName = dto.DisplayName;
        user.Phone = dto.Phone;
        user.JobTitle = dto.JobTitle;
        user.Department = dto.Department;
        user.Location = dto.Location;
        user.Bio = dto.Bio;
        user.AvatarColor = dto.AvatarColor;
        user.Status = dto.Status;
        user.StatusMessage = dto.StatusMessage;

        await _db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    [HttpPut("me/preferences")]
    public async Task<ActionResult<Dtos.UserDto>> UpdatePreferences(UpdatePreferencesDto dto)
    {
        var user = await RequireUser();

        if (SupportedLanguages.Contains(dto.PreferredLanguage)) user.PreferredLanguage = dto.PreferredLanguage;
        if (SupportedThemes.Contains(dto.Theme)) user.Theme = dto.Theme;
        user.Timezone = dto.Timezone;
        user.DateFormat = dto.DateFormat;
        user.TimeFormat = dto.TimeFormat;
        user.FirstDayOfWeek = dto.FirstDayOfWeek;
        user.DefaultView = dto.DefaultView;
        user.ShowCompletedTasks = dto.ShowCompletedTasks;
        user.ConfirmBeforeDelete = dto.ConfirmBeforeDelete;
        user.AutoFollowCreatedTasks = dto.AutoFollowCreatedTasks;
        user.AutoFollowAssignedTasks = dto.AutoFollowAssignedTasks;
        if (dto.DefaultCalendarView is "month" or "week" or "day") user.DefaultCalendarView = dto.DefaultCalendarView;
        if (dto.DefaultEventDurationMinutes >= 15 && dto.DefaultEventDurationMinutes <= 480)
            user.DefaultEventDurationMinutes = dto.DefaultEventDurationMinutes;

        await _db.SaveChangesAsync();
        return Ok(ToDto(user));
    }

    [HttpGet("me/notifications")]
    public async Task<ActionResult<NotificationPreferencesDto>> GetNotificationPreferences()
    {
        var user = await RequireUser();
        return Ok(ParseNotificationPreferences(user.NotificationPreferencesJson));
    }

    [HttpPut("me/notifications")]
    public async Task<ActionResult<NotificationPreferencesDto>> UpdateNotificationPreferences(NotificationPreferencesDto dto)
    {
        var user = await RequireUser();
        user.NotificationPreferencesJson = JsonSerializer.Serialize(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }

    private static NotificationPreferencesDto ParseNotificationPreferences(string json)
    {
        try
        {
            var parsed = JsonSerializer.Deserialize<NotificationPreferencesDto>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (parsed == null || parsed.Types.Count == 0) return NotificationTypes.Default();
            return parsed;
        }
        catch
        {
            return NotificationTypes.Default();
        }
    }

    [HttpGet("me/working-hours")]
    public async Task<ActionResult<UpdateWorkingHoursDto>> GetWorkingHours()
    {
        var user = await RequireUser();
        return Ok(new UpdateWorkingHoursDto(user.WorkingDays, user.WorkStartTime, user.WorkEndTime, user.WorkBreakStart, user.WorkBreakEnd));
    }

    [HttpPut("me/working-hours")]
    public async Task<ActionResult<UpdateWorkingHoursDto>> UpdateWorkingHours(UpdateWorkingHoursDto dto)
    {
        var user = await RequireUser();
        user.WorkingDays = dto.WorkingDays;
        user.WorkStartTime = dto.WorkStartTime;
        user.WorkEndTime = dto.WorkEndTime;
        user.WorkBreakStart = dto.WorkBreakStart;
        user.WorkBreakEnd = dto.WorkBreakEnd;
        await _db.SaveChangesAsync();
        return Ok(dto);
    }

    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var user = await RequireUser();
        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });
        return NoContent();
    }

    [HttpGet("me/sessions")]
    public async Task<ActionResult<List<UserSessionDto>>> GetSessions()
    {
        var userId = this.GetUserId();
        var currentSessionId = this.GetSessionId();
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked)
            .OrderByDescending(s => s.LastActiveAt)
            .Select(s => new UserSessionDto(s.Id, s.Browser, s.OperatingSystem, s.Device, s.IpAddress, s.CreatedAt, s.LastActiveAt, s.Id == currentSessionId))
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpDelete("me/sessions/{id:guid}")]
    public async Task<IActionResult> RevokeSession(Guid id)
    {
        var userId = this.GetUserId();
        var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);
        if (session == null) return NotFound();
        session.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("me/sessions/revoke-others")]
    public async Task<IActionResult> RevokeOtherSessions()
    {
        var userId = this.GetUserId();
        var currentSessionId = this.GetSessionId();
        var others = await _db.UserSessions
            .Where(s => s.UserId == userId && !s.IsRevoked && s.Id != currentSessionId)
            .ToListAsync();
        foreach (var s in others) s.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("me/deactivate")]
    public async Task<IActionResult> Deactivate()
    {
        var user = await RequireUser();
        user.IsDeactivated = true;
        var sessions = await _db.UserSessions.Where(s => s.UserId == user.Id && !s.IsRevoked).ToListAsync();
        foreach (var s in sessions) s.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyAccount()
    {
        var userId = this.GetUserId();

        var ownsProjects = await _db.Projects.AnyAsync(p => p.CreatedById == userId);
        if (ownsProjects)
            return BadRequest(new
            {
                message = "You own one or more projects. Transfer ownership or delete those projects before deleting your account."
            });

        var hasAuthoredContent = await _db.WorkPackages.AnyAsync(w => w.AuthorId == userId)
            || await _db.Comments.AnyAsync(c => c.AuthorId == userId)
            || await _db.TimeEntries.AnyAsync(t => t.UserId == userId);
        if (hasAuthoredContent)
            return BadRequest(new
            {
                message = "Your account has tasks, comments or logged time attached to it and can't be permanently deleted yet. You can deactivate your account instead."
            });

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("me/activity")]
    public async Task<ActionResult<object>> GetActivity()
    {
        var userId = this.GetUserId();
        return Ok(new
        {
            ProjectsJoined = await _db.ProjectMembers.CountAsync(m => m.UserId == userId),
            TasksCreated = await _db.WorkPackages.CountAsync(w => w.AuthorId == userId),
            TasksCompleted = await _db.WorkPackages.CountAsync(w => w.Assignees.Any(a => a.UserId == userId) && w.Status == WorkPackageStatus.Closed),
            CommentsPosted = await _db.Comments.CountAsync(c => c.AuthorId == userId),
        });
    }

    [HttpGet("me/export")]
    public async Task<IActionResult> ExportMyData()
    {
        var userId = this.GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var data = new
        {
            Profile = ToDto(user),
            WorkPackagesAuthored = await _db.WorkPackages.Where(w => w.AuthorId == userId)
                .Select(w => new { w.Subject, w.Status, w.CreatedAt }).ToListAsync(),
            WorkPackagesAssigned = await _db.WorkPackages.Where(w => w.Assignees.Any(a => a.UserId == userId))
                .Select(w => new { w.Subject, w.Status, w.CreatedAt }).ToListAsync(),
            Comments = await _db.Comments.Where(c => c.AuthorId == userId)
                .Select(c => new { c.Text, c.CreatedAt }).ToListAsync(),
            TimeEntries = await _db.TimeEntries.Where(t => t.UserId == userId)
                .Select(t => new { t.Hours, t.SpentOn, t.Comment }).ToListAsync(),
            ExportedAt = DateTime.UtcNow,
        };

        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        var bytes = System.Text.Encoding.UTF8.GetBytes(json);
        return File(bytes, "application/json", $"cedplan-export-{DateTime.UtcNow:yyyyMMdd}.json");
    }

    [HttpGet]
    public async Task<ActionResult<List<Dtos.UserDto>>> Search([FromQuery] string? q, [FromQuery] string? department)
    {
        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u => u.Email!.Contains(q) || u.FullName.Contains(q) || (u.Department != null && u.Department.Contains(q)));
        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(u => u.Department == department);

        var users = await query.OrderBy(u => u.FullName).Take(50).ToListAsync();
        return Ok(users.Select(ToDto).ToList());
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<string>>> ListDepartments()
    {
        var departments = await _db.Users
            .Where(u => u.Department != null && u.Department != "")
            .Select(u => u.Department!)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();
        return Ok(departments);
    }

    // --- Administration ---
    // Which workspace role can view the Administration area, change roles, deactivate/delete
    // users, etc. is driven by the Permission/RolePermission tables (see PermissionsController),
    // not by hardcoded role comparisons — an Admin can regrant these from the Administration UI.

    [HttpGet("admin/all")]
    public async Task<ActionResult<List<object>>> AdminListUsers()
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersView)) return Forbid();

        var users = await _db.Users
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.AvatarColor,
                u.PreferredLanguage,
                u.Role,
                u.IsAdmin,
                u.IsDeactivated,
                u.CreatedAt,
                ProjectCount = _db.ProjectMembers.Count(m => m.UserId == u.Id),
            })
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return Ok(users);
    }

    [HttpPut("admin/{id:guid}/role")]
    public async Task<IActionResult> AdminSetRole(Guid id, UpdateSystemRoleDto dto)
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersManageRoles)) return Forbid();
        if (id == this.GetUserId() && dto.Role != SystemRole.Admin)
            return BadRequest(new { message = "You cannot remove your own admin access." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.Role = dto.Role;
        user.IsAdmin = dto.Role == SystemRole.Admin;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("admin/{id:guid}/deactivate")]
    public async Task<IActionResult> AdminDeactivateUser(Guid id)
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersDeactivate)) return Forbid();
        if (id == this.GetUserId())
            return BadRequest(new { message = "You cannot deactivate your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsDeactivated = true;
        var sessions = await _db.UserSessions.Where(s => s.UserId == id && !s.IsRevoked).ToListAsync();
        foreach (var s in sessions) s.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("admin/{id:guid}/reactivate")]
    public async Task<IActionResult> AdminReactivateUser(Guid id)
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersDeactivate)) return Forbid();

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.IsDeactivated = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("admin/{id:guid}")]
    public async Task<IActionResult> AdminDeleteUser(Guid id)
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersDelete)) return Forbid();
        if (id == this.GetUserId())
            return BadRequest(new { message = "You cannot delete your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("admin/stats")]
    public async Task<ActionResult<object>> AdminStats()
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.AdminView)) return Forbid();

        return Ok(new
        {
            UserCount = await _db.Users.CountAsync(),
            ProjectCount = await _db.Projects.CountAsync(),
            WorkPackageCount = await _db.WorkPackages.CountAsync(),
            AdminCount = await _db.Users.CountAsync(u => u.Role == SystemRole.Admin),
            ManagerCount = await _db.Users.CountAsync(u => u.Role == SystemRole.Manager),
        });
    }
}
