using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Full update of a work package's fields and assignee set, notifying newly-added assignees and,
/// separately, everyone assigned if the status changed.</summary>
public class UpdateWorkPackage
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public UpdateWorkPackage(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    /// <exception cref="NotFoundException">No such work package in this project.</exception>
    public async Task<WorkPackageDto> Handle(Guid projectId, Guid id, Guid actorId, UpdateWorkPackageDto dto)
    {
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId)
            ?? throw new NotFoundException();

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

        await WorkPackageMapper.SetAssigneesAsync(_db, wp, dto.AssigneeIds);
        await _db.SaveChangesAsync();

        wp.Assignees = await _db.WorkPackageAssignees.Where(a => a.WorkPackageId == wp.Id).Include(a => a.User).ToListAsync();
        if (wp.ParentId != previousParentId)
        {
            wp.Parent = null;
            if (wp.ParentId != null) await _db.Entry(wp).Reference(w => w.Parent).LoadAsync();
        }

        var actor = await _db.Users.FindAsync(actorId);
        var newAssigneeIds = wp.Assignees.Select(a => a.UserId).Where(uid => !previousAssigneeIds.Contains(uid)).ToList();

        if (newAssigneeIds.Count > 0)
        {
            await _notifications.NotifyManyAsync(
                newAssigneeIds, actorId, "taskAssigned",
                $"{actor?.FullName} ți-a atribuit o sarcină",
                wp.Subject, projectId, wp.Id);
        }
        if (previousStatus != wp.Status)
        {
            await _notifications.NotifyManyAsync(
                wp.Assignees.Select(a => a.UserId), actorId, "taskStatusChanged",
                $"{actor?.FullName} a schimbat starea sarcinii",
                $"{wp.Subject}: {previousStatus} → {wp.Status}", projectId, wp.Id);
        }

        return WorkPackageMapper.ToDto(wp);
    }
}
