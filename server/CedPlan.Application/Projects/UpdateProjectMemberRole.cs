using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Changes a member's role. The caller's Admin+ role must already be checked by the controller.</summary>
public class UpdateProjectMemberRole
{
    private readonly AppDbContext _db;

    public UpdateProjectMemberRole(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">The member row doesn't exist on this project.</exception>
    public async Task Handle(Guid projectId, Guid memberId, UpdateMemberRoleDto dto)
    {
        var member = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.ProjectId == projectId)
            ?? throw new NotFoundException();

        member.Role = dto.Role;
        await _db.SaveChangesAsync();
    }
}
