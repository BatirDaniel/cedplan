using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CedPlan.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly AppDbContext _db;

    private static readonly HashSet<string> SupportedLanguages = new() { "en", "it", "ro", "ru" };

    public AuthController(UserManager<ApplicationUser> userManager, TokenService tokenService, AppDbContext db)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _db = db;
    }

    private static UserDto ToDto(ApplicationUser u) => new(
        u.Id, u.FullName, u.FirstName, u.LastName, u.DisplayName, u.Email!, u.Phone, u.JobTitle, u.Department,
        u.Location, u.Bio, u.AvatarColor, u.Status, u.StatusMessage, u.PreferredLanguage, u.Theme, u.Timezone,
        u.DateFormat, u.TimeFormat, u.FirstDayOfWeek, u.DefaultView, u.ShowCompletedTasks, u.ConfirmBeforeDelete,
        u.AutoFollowCreatedTasks, u.AutoFollowAssignedTasks, u.DefaultCalendarView, u.DefaultEventDurationMinutes,
        u.Role, u.IsAdmin);

    private async Task<string> IssueTokenAsync(ApplicationUser user)
    {
        var ua = Request.Headers.UserAgent.ToString();
        var parsed = UserAgentParser.Parse(ua);
        var session = new UserSession
        {
            UserId = user.Id,
            UserAgent = ua,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            Browser = parsed.Browser,
            OperatingSystem = parsed.OperatingSystem,
            Device = parsed.Device,
        };
        _db.UserSessions.Add(session);
        await _db.SaveChangesAsync();
        return _tokenService.CreateToken(user, session.Id);
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto, [FromQuery] string? lang)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "All fields are required." });

        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing != null)
            return BadRequest(new { message = "An account with this email already exists." });

        var colors = new[] { "#2563eb", "#0ea5e9", "#6366f1", "#0891b2", "#4f46e5", "#2dd4bf" };
        var isFirstUser = !_userManager.Users.Any();
        var nameParts = dto.FullName.Trim().Split(' ', 2);
        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            FirstName = nameParts.ElementAtOrDefault(0),
            LastName = nameParts.ElementAtOrDefault(1),
            AvatarColor = colors[Math.Abs(dto.Email.GetHashCode()) % colors.Length],
            PreferredLanguage = lang != null && SupportedLanguages.Contains(lang) ? lang : "en",
            Role = isFirstUser ? SystemRole.Admin : SystemRole.Member,
            IsAdmin = isFirstUser
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        var token = await IssueTokenAsync(user);
        return Ok(new AuthResponseDto(token, ToDto(user)));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            return Unauthorized(new { message = "Incorrect email or password." });
        if (user.IsDeactivated)
            return Unauthorized(new { message = "This account has been deactivated." });

        var token = await IssueTokenAsync(user);
        return Ok(new AuthResponseDto(token, ToDto(user)));
    }
}
