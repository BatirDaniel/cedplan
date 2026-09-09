using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;

namespace CedPlan.Application.WorkPackages;

/// <summary>Logs time spent on a work package.</summary>
public class AddWorkPackageTimeEntry
{
    private readonly AppDbContext _db;

    public AddWorkPackageTimeEntry(AppDbContext db) => _db = db;

    /// <exception cref="ValidationException">Hours is zero or negative.</exception>
    public async Task<TimeEntryDto> Handle(Guid workPackageId, Guid userId, CreateTimeEntryDto dto)
    {
        if (dto.Hours <= 0)
            throw new ValidationException("Numărul de ore trebuie să fie pozitiv.");

        var entry = new TimeEntry { WorkPackageId = workPackageId, UserId = userId, Hours = dto.Hours, SpentOn = dto.SpentOn, Comment = dto.Comment };
        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var wp = await _db.WorkPackages.FindAsync(workPackageId);
        return new TimeEntryDto(entry.Id, workPackageId, wp!.Subject, userId, user!.FullName, entry.Hours, entry.SpentOn, entry.Comment, entry.CreatedAt);
    }
}
