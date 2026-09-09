using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Status-only update (used by the calendar/list quick-actions) — auto-completes progress to 100%
/// when the task is closed, and notifies assignees when the status actually changes.</summary>
public class UpdateWorkPackageStatus
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public UpdateWorkPackageStatus(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    /// <exception cref="NotFoundException">No such work package in this project.</exception>
    public async Task<WorkPackageDto> Handle(Guid projectId, Guid id, Guid actorId, UpdateStatusDto dto)
    {
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId)
            ?? throw new NotFoundException();

        var previousStatus = wp.Status;
        wp.Status = dto.Status;
        if (dto.Status == WorkPackageStatus.Closed) wp.PercentDone = 100;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (previousStatus != wp.Status)
        {
            var actor = await _db.Users.FindAsync(actorId);
            await _notifications.NotifyManyAsync(
                wp.Assignees.Select(a => a.UserId), actorId, "taskStatusChanged",
                $"{actor?.FullName} a schimbat starea sarcinii",
                $"{wp.Subject}: {previousStatus} → {wp.Status}", projectId, wp.Id);
        }

        return WorkPackageMapper.ToDto(wp);
    }
}
