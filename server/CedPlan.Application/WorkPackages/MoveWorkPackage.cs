using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Lightweight kanban drag: only status + board position change, no full DTO round trip and no notification.</summary>
public class MoveWorkPackage
{
    private readonly AppDbContext _db;

    public MoveWorkPackage(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">No such work package in this project.</exception>
    public async Task Handle(Guid projectId, Guid id, MoveWorkPackageDto dto)
    {
        var wp = await _db.WorkPackages.FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId)
            ?? throw new NotFoundException();

        wp.Status = dto.Status;
        wp.Position = dto.Position;
        wp.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }
}
