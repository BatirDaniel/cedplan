using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using CedPlan.Api.Hubs;
using CedPlan.Api.Models;
using CedPlan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/work-packages")]
public class WorkPackagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<CommentsHub> _hub;
    private readonly NotificationService _notifications;
    private readonly PermissionService _permissions;

    public WorkPackagesController(AppDbContext db, IHubContext<CommentsHub> hub, NotificationService notifications, PermissionService permissions)
    {
        _db = db;
        _hub = hub;
        _notifications = notifications;
        _permissions = permissions;
    }

    private static List<Guid> ParseMentions(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? new List<Guid>() : raw.Split(',').Select(Guid.Parse).ToList();

    private static string? SerializeMentions(List<Guid>? ids) =>
        ids == null || ids.Count == 0 ? null : string.Join(',', ids);

    private CommentDto ToCommentDto(Comment c) => new(
        c.Id, c.WorkPackageId, c.AuthorId, c.Author!.FullName, c.Author.AvatarColor,
        c.Text, c.ImageUrl, ParseMentions(c.MentionedUserIds), c.CreatedAt);

    /// <summary>The caller's role on this project. An Admin with projects.manage_any is a virtual Owner everywhere.</summary>
    private async Task<ProjectRole?> MyRole(Guid projectId)
    {
        var actual = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == this.GetUserId())
            .Select(m => (ProjectRole?)m.Role)
            .FirstOrDefaultAsync();
        if (actual != null) return actual;

        if (await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.ProjectsManageAny))
            return ProjectRole.Owner;

        return null;
    }

    private async Task<bool> IsMember(Guid projectId) => await MyRole(projectId) != null;

    /// <summary>Viewers can look but not touch: creating/editing/assigning/commenting/logging time all need at least Member.</summary>
    private async Task<bool> CanEdit(Guid projectId) => await MyRole(projectId) is ProjectRole role && role >= ProjectRole.Member;

    private static WorkPackageDto ToDto(WorkPackage w) => new(
        w.Id, w.ProjectId, w.Sequence, w.Subject, w.Description, w.Type, w.Status, w.Priority,
        w.ParentId, w.Parent?.Subject,
        w.AuthorId, w.Author?.FullName ?? "",
        w.Assignees.Where(a => a.User != null).Select(a => new AssigneeDto(a.UserId, a.User!.FullName, a.User.AvatarColor)).ToList(),
        w.StartDate, w.DueDate, w.EstimatedHours, w.PercentDone,
        w.Position, w.CreatedAt, w.UpdatedAt,
        w.TimeEntries?.Sum(t => t.Hours) ?? 0);

    private async Task SetAssigneesAsync(WorkPackage wp, List<Guid>? assigneeIds)
    {
        var existing = await _db.WorkPackageAssignees.Where(a => a.WorkPackageId == wp.Id).ToListAsync();
        _db.WorkPackageAssignees.RemoveRange(existing);
        foreach (var userId in (assigneeIds ?? new List<Guid>()).Distinct())
            _db.WorkPackageAssignees.Add(new WorkPackageAssignee { WorkPackageId = wp.Id, UserId = userId });
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkPackageDto>>> GetAll(Guid projectId)
    {
        if (!await IsMember(projectId)) return Forbid();

        var items = await _db.WorkPackages
            .Where(w => w.ProjectId == projectId)
            .Include(w => w.Author)
            .Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent)
            .Include(w => w.TimeEntries)
            .OrderBy(w => w.Position)
            .ToListAsync();

        return Ok(items.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkPackageDto>> GetOne(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var w = await _db.WorkPackages
            .Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (w == null) return NotFound();
        return Ok(ToDto(w));
    }

    [HttpPost]
    public async Task<ActionResult<WorkPackageDto>> Create(Guid projectId, CreateWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Subject)) return BadRequest(new { message = "Titlul este obligatoriu." });

        var maxPos = await _db.WorkPackages.Where(w => w.ProjectId == projectId && w.Status == dto.Status)
            .Select(w => (double?)w.Position).MaxAsync() ?? 0;
        var nextSeq = await _db.WorkPackages.Where(w => w.ProjectId == projectId)
            .Select(w => (int?)w.Sequence).MaxAsync() ?? 0;

        var wp = new WorkPackage
        {
            ProjectId = projectId,
            Sequence = nextSeq + 1,
            Subject = dto.Subject,
            Description = dto.Description,
            Type = dto.Type,
            Status = dto.Status,
            Priority = dto.Priority,
            ParentId = dto.ParentId,
            StartDate = dto.StartDate,
            DueDate = dto.DueDate,
            EstimatedHours = dto.EstimatedHours,
            AuthorId = this.GetUserId(),
            Position = maxPos + 1024
        };
        _db.WorkPackages.Add(wp);
        await _db.SaveChangesAsync();

        await SetAssigneesAsync(wp, dto.AssigneeIds);
        await _db.SaveChangesAsync();

        await _db.Entry(wp).Reference(w => w.Author).LoadAsync();
        await _db.Entry(wp).Collection(w => w.Assignees).Query().Include(a => a.User).LoadAsync();
        if (wp.ParentId != null) await _db.Entry(wp).Reference(w => w.Parent).LoadAsync();

        if (dto.AssigneeIds is { Count: > 0 })
        {
            await _notifications.NotifyManyAsync(
                dto.AssigneeIds, wp.AuthorId, "taskAssigned",
                $"{wp.Author?.FullName} ți-a atribuit o sarcină",
                wp.Subject, projectId, wp.Id);
        }

        return CreatedAtAction(nameof(GetOne), new { projectId, id = wp.Id }, ToDto(wp));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkPackageDto>> Update(Guid projectId, Guid id, UpdateWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp == null) return NotFound();

        var userId = this.GetUserId();
        var previousAssigneeIds = wp.Assignees.Select(a => a.UserId).ToHashSet();
        var previousParentId = wp.ParentId;
        var previousStatus = wp.Status;

        wp.Subject = dto.Subject;
        wp.Description = dto.Description;
        wp.Type = dto.Type;
        wp.Status = dto.Status;
        wp.Priority = dto.Priority;
        wp.ParentId = dto.ParentId;
        wp.StartDate = dto.StartDate;
        wp.DueDate = dto.DueDate;
        wp.EstimatedHours = dto.EstimatedHours;
        wp.PercentDone = dto.PercentDone;
        wp.UpdatedAt = DateTime.UtcNow;

        await SetAssigneesAsync(wp, dto.AssigneeIds);
        await _db.SaveChangesAsync();

        wp.Assignees = await _db.WorkPackageAssignees.Where(a => a.WorkPackageId == wp.Id).Include(a => a.User).ToListAsync();
        if (wp.ParentId != previousParentId)
        {
            wp.Parent = null;
            if (wp.ParentId != null) await _db.Entry(wp).Reference(w => w.Parent).LoadAsync();
        }

        var actor = await _db.Users.FindAsync(userId);
        var newAssigneeIds = wp.Assignees.Select(a => a.UserId).Where(uid => !previousAssigneeIds.Contains(uid)).ToList();

        if (newAssigneeIds.Count > 0)
        {
            await _notifications.NotifyManyAsync(
                newAssigneeIds, userId, "taskAssigned",
                $"{actor?.FullName} ți-a atribuit o sarcină",
                wp.Subject, projectId, wp.Id);
        }
        if (previousStatus != wp.Status)
        {
            await _notifications.NotifyManyAsync(
                wp.Assignees.Select(a => a.UserId), userId, "taskStatusChanged",
                $"{actor?.FullName} a schimbat starea sarcinii",
                $"{wp.Subject}: {previousStatus} → {wp.Status}", projectId, wp.Id);
        }

        return Ok(ToDto(wp));
    }

    [HttpPatch("{id:guid}/move")]
    public async Task<IActionResult> Move(Guid projectId, Guid id, MoveWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp == null) return NotFound();

        wp.Status = dto.Status;
        wp.Position = dto.Position;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<WorkPackageDto>> UpdateStatus(Guid projectId, Guid id, UpdateStatusDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp == null) return NotFound();

        var previousStatus = wp.Status;
        wp.Status = dto.Status;
        if (dto.Status == WorkPackageStatus.Closed) wp.PercentDone = 100;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (previousStatus != wp.Status)
        {
            var actor = await _db.Users.FindAsync(this.GetUserId());
            await _notifications.NotifyManyAsync(
                wp.Assignees.Select(a => a.UserId), this.GetUserId(), "taskStatusChanged",
                $"{actor?.FullName} a schimbat starea sarcinii",
                $"{wp.Subject}: {previousStatus} → {wp.Status}", projectId, wp.Id);
        }

        return Ok(ToDto(wp));
    }

    [HttpPatch("{id:guid}/schedule")]
    public async Task<ActionResult<WorkPackageDto>> UpdateSchedule(Guid projectId, Guid id, UpdateScheduleDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp == null) return NotFound();

        wp.StartDate = dto.StartDate;
        wp.DueDate = dto.DueDate;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(wp));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp == null) return NotFound();

        // CalendarEvent -> WorkPackage is Restrict (avoids a multi-cascade-path error), so unlink first.
        await _db.CalendarEvents.Where(e => e.WorkPackageId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.WorkPackageId, (Guid?)null));

        _db.WorkPackages.Remove(wp);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Comments
    [HttpGet("{id:guid}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetComments(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var comments = await _db.Comments.Where(c => c.WorkPackageId == id)
            .Include(c => c.Author).OrderBy(c => c.CreatedAt)
            .ToListAsync();
        return Ok(comments.Select(ToCommentDto).ToList());
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(Guid projectId, Guid id, CreateCommentDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Text) && string.IsNullOrWhiteSpace(dto.ImageUrl))
            return BadRequest(new { message = "Mesajul nu poate fi gol." });

        var userId = this.GetUserId();
        var comment = new Comment
        {
            WorkPackageId = id,
            AuthorId = userId,
            Text = dto.Text ?? string.Empty,
            ImageUrl = dto.ImageUrl,
            MentionedUserIds = SerializeMentions(dto.MentionedUserIds),
        };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        comment.Author = await _db.Users.FindAsync(userId);
        var result = ToCommentDto(comment);

        await _hub.Clients.Group(CommentsHub.GroupName(id)).SendAsync("ReceiveComment", result);

        var wp = await _db.WorkPackages.Include(w => w.Assignees).FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (wp != null)
        {
            var mentioned = ParseMentions(comment.MentionedUserIds);
            var recipients = new HashSet<Guid>();
            if (wp.AuthorId != Guid.Empty) recipients.Add(wp.AuthorId);
            foreach (var a in wp.Assignees) recipients.Add(a.UserId);
            recipients.ExceptWith(mentioned);

            await _notifications.NotifyManyAsync(
                recipients, userId, "newComment",
                $"{comment.Author?.FullName} a comentat",
                wp.Subject, projectId, wp.Id);

            await _notifications.NotifyManyAsync(
                mentioned, userId, "mentioned",
                $"{comment.Author?.FullName} te-a menționat",
                wp.Subject, projectId, wp.Id);
        }

        return Ok(result);
    }

    // Time entries
    [HttpGet("{id:guid}/time-entries")]
    public async Task<ActionResult<List<TimeEntryDto>>> GetTimeEntries(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var entries = await _db.TimeEntries.Where(t => t.WorkPackageId == id)
            .Include(t => t.User).Include(t => t.WorkPackage)
            .OrderByDescending(t => t.SpentOn)
            .Select(t => new TimeEntryDto(t.Id, t.WorkPackageId, t.WorkPackage!.Subject, t.UserId, t.User!.FullName, t.Hours, t.SpentOn, t.Comment, t.CreatedAt))
            .ToListAsync();
        return Ok(entries);
    }

    [HttpPost("{id:guid}/time-entries")]
    public async Task<ActionResult<TimeEntryDto>> AddTimeEntry(Guid projectId, Guid id, CreateTimeEntryDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (dto.Hours <= 0) return BadRequest(new { message = "Numărul de ore trebuie să fie pozitiv." });

        var userId = this.GetUserId();
        var entry = new TimeEntry { WorkPackageId = id, UserId = userId, Hours = dto.Hours, SpentOn = dto.SpentOn, Comment = dto.Comment };
        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var wp = await _db.WorkPackages.FindAsync(id);
        return Ok(new TimeEntryDto(entry.Id, id, wp!.Subject, userId, user!.FullName, entry.Hours, entry.SpentOn, entry.Comment, entry.CreatedAt));
    }
}
