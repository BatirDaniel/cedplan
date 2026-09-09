using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Date-only update (used by calendar drag-to-reschedule) — deliberately touches nothing else,
/// so dragging a task on the calendar can never wipe its description or other fields.</summary>
public class UpdateWorkPackageSchedule
{
    private readonly AppDbContext _db;

    public UpdateWorkPackageSchedule(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">No such work package in this project.</exception>
    public async Task<WorkPackageDto> Handle(Guid projectId, Guid id, UpdateScheduleDto dto)
    {
        var wp = await _db.WorkPackages.Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId)
            ?? throw new NotFoundException();

        wp.StartDate = dto.StartDate;
        wp.DueDate = dto.DueDate;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return WorkPackageMapper.ToDto(wp);
    }
}
