using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Hubs;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>
/// Adds a comment, pushes it live to everyone viewing the work package (SignalR), and notifies the
/// author + assignees ("newComment") separately from anyone @mentioned ("mentioned") — a mentioned
/// recipient gets only the mention notification, not both.
/// </summary>
public class AddWorkPackageComment
{
    private readonly AppDbContext _db;
    private readonly IHubContext<CommentsHub> _hub;
    private readonly NotificationService _notifications;

    public AddWorkPackageComment(AppDbContext db, IHubContext<CommentsHub> hub, NotificationService notifications)
    {
        _db = db;
        _hub = hub;
        _notifications = notifications;
    }

    /// <exception cref="ValidationException">Both the text and the image are empty.</exception>
    public async Task<CommentDto> Handle(Guid projectId, Guid workPackageId, Guid authorId, CreateCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text) && string.IsNullOrWhiteSpace(dto.ImageUrl))
            throw new ValidationException("Mesajul nu poate fi gol.");

        var comment = new Comment
        {
            WorkPackageId = workPackageId,
            AuthorId = authorId,
            Text = dto.Text ?? string.Empty,
            ImageUrl = dto.ImageUrl,
            MentionedUserIds = WorkPackageMapper.SerializeMentions(dto.MentionedUserIds),
        };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        comment.Author = await _db.Users.FindAsync(authorId);
        var result = WorkPackageMapper.ToCommentDto(comment);

        await _hub.Clients.Group(CommentsHub.GroupName(workPackageId)).SendAsync("ReceiveComment", result);

        var wp = await _db.WorkPackages.Include(w => w.Assignees).FirstOrDefaultAsync(w => w.Id == workPackageId && w.ProjectId == projectId);
        if (wp != null)
        {
            var mentioned = WorkPackageMapper.ParseMentions(comment.MentionedUserIds);
            var recipients = new HashSet<Guid>();
            if (wp.AuthorId != Guid.Empty) recipients.Add(wp.AuthorId);
            foreach (var a in wp.Assignees) recipients.Add(a.UserId);
            recipients.ExceptWith(mentioned);

            await _notifications.NotifyManyAsync(
                recipients, authorId, "newComment",
                $"{comment.Author?.FullName} a comentat",
                wp.Subject, projectId, wp.Id);

            await _notifications.NotifyManyAsync(
                mentioned, authorId, "mentioned",
                $"{comment.Author?.FullName} te-a menționat",
                wp.Subject, projectId, wp.Id);
        }

        return result;
    }
}
