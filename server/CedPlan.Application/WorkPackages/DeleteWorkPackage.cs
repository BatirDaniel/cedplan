using CedPlan.Application.Common;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Deletes a work package. Unlinks any calendar events pointing at it first, since
/// CalendarEvent -&gt; WorkPackage is a Restrict FK (avoids a multiple-cascade-path conflict through Project).</summary>
public class DeleteWorkPackage
{
    private readonly AppDbContext _db;

    public DeleteWorkPackage(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">No such work package in this project.</exception>
    public async Task Handle(Guid projectId, Guid id)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId)
            ?? throw new NotFoundException();

        await _db.CalendarEvents.Where(e => e.WorkPackageId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.WorkPackageId, (Guid?)null));

        _db.WorkPackages.Remove(wp);
        await _db.SaveChangesAsync();
    }
}
