using CedPlan.Application.Common;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Removes a member from a project. The caller's Admin+ role must already be checked by the controller.</summary>
public class RemoveProjectMember
{
    private readonly AppDbContext _db;

    public RemoveProjectMember(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">The member row doesn't exist on this project.</exception>
    public async Task Handle(Guid projectId, Guid memberId)
    {
        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId)
            ?? throw new NotFoundException();

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
    }
}
