using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Entity-to-DTO mapping shared by every WorkPackages use case, kept in one place so the shape
/// returned to the frontend can't drift between operations.</summary>
internal static class WorkPackageMapper
{
    /// <summary>Replaces a work package's assignee set wholesale (used by both create and update).</summary>
    public static async Task SetAssigneesAsync(AppDbContext db, WorkPackage wp, List<Guid>? assigneeIds)
    {
        var existing = await db.WorkPackageAssignees.Where(a => a.WorkPackageId == wp.Id).ToListAsync();
        db.WorkPackageAssignees.RemoveRange(existing);
        foreach (var userId in (assigneeIds ?? new List<Guid>()).Distinct())
            db.WorkPackageAssignees.Add(new WorkPackageAssignee { WorkPackageId = wp.Id, UserId = userId });
    }

    public static List<Guid> ParseMentions(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? new List<Guid>() : raw.Split(',').Select(Guid.Parse).ToList();

    public static string? SerializeMentions(List<Guid>? ids) =>
        ids == null || ids.Count == 0 ? null : string.Join(',', ids);

    public static CommentDto ToCommentDto(Comment c) => new(
        c.Id, c.WorkPackageId, c.AuthorId, c.Author!.FullName, c.Author.AvatarColor,
        c.Text, c.ImageUrl, ParseMentions(c.MentionedUserIds), c.CreatedAt);

    public static WorkPackageDto ToDto(WorkPackage w) => new(
        w.Id, w.ProjectId, w.Sequence, w.Subject, w.Description, w.Type, w.Status, w.Priority,
        w.ParentId, w.Parent?.Subject,
        w.AuthorId, w.Author?.FullName ?? "",
        w.Assignees.Where(a => a.User != null).Select(a => new AssigneeDto(a.UserId, a.User!.FullName, a.User.AvatarColor)).ToList(),
        w.StartDate, w.DueDate, w.EstimatedHours, w.PercentDone,
        w.Position, w.CreatedAt, w.UpdatedAt,
        w.TimeEntries?.Sum(t => t.Hours) ?? 0);
}
