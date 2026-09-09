using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Read-side operations for work packages, comments and time entries. Access checks stay in the controller.</summary>
public class WorkPackageQueries
{
    private readonly AppDbContext _db;

    public WorkPackageQueries(AppDbContext db) => _db = db;

    public async Task<List<WorkPackageDto>> ListAll(Guid projectId)
    {
        var items = await _db.WorkPackages
            .Where(w => w.ProjectId == projectId)
            .Include(w => w.Author)
            .Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent)
            .Include(w => w.TimeEntries)
            .OrderBy(w => w.Position)
            .ToListAsync();

        return items.Select(WorkPackageMapper.ToDto).ToList();
    }

    public async Task<WorkPackageDto?> GetOne(Guid projectId, Guid id)
    {
        var w = await _db.WorkPackages
            .Include(w => w.Author).Include(w => w.Assignees).ThenInclude(a => a.User)
            .Include(w => w.Parent).Include(w => w.TimeEntries)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        return w == null ? null : WorkPackageMapper.ToDto(w);
    }

    public async Task<List<CommentDto>> GetComments(Guid id)
    {
        var comments = await _db.Comments.Where(c => c.WorkPackageId == id)
            .Include(c => c.Author).OrderBy(c => c.CreatedAt)
            .ToListAsync();
        return comments.Select(WorkPackageMapper.ToCommentDto).ToList();
    }

    public async Task<List<TimeEntryDto>> GetTimeEntries(Guid id)
    {
        return await _db.TimeEntries.Where(t => t.WorkPackageId == id)
            .Include(t => t.User).Include(t => t.WorkPackage)
            .OrderByDescending(t => t.SpentOn)
            .Select(t => new TimeEntryDto(t.Id, t.WorkPackageId, t.WorkPackage!.Subject, t.UserId, t.User!.FullName, t.Hours, t.SpentOn, t.Comment, t.CreatedAt))
            .ToListAsync();
    }
}
