using CedPlan.Application.Common;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Deletes a project. The caller's Owner role must already be checked by the controller.</summary>
public class DeleteProject
{
    private readonly AppDbContext _db;

    public DeleteProject(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">The project no longer exists.</exception>
    public async Task Handle(Guid projectId)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new NotFoundException();

        // CalendarEvent -> Project is Cascade, but CalendarEvent -> WorkPackage is Restrict, so remove
        // events explicitly first to avoid a dangling-reference conflict while the project cascades.
        await _db.CalendarEvents.Where(e => e.ProjectId == projectId).ExecuteDeleteAsync();

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
    }
}
