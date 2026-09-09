using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Updates a project's editable fields. The caller's Admin+ role must already be checked by the controller.</summary>
public class UpdateProject
{
    private readonly AppDbContext _db;

    public UpdateProject(AppDbContext db) => _db = db;

    /// <exception cref="NotFoundException">The project no longer exists.</exception>
    public async Task Handle(Guid projectId, UpdateProjectDto dto)
    {
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new NotFoundException();

        project.Name = dto.Name;
        project.Description = dto.Description;
        project.Color = dto.Color;
        project.IsArchived = dto.IsArchived;
        await _db.SaveChangesAsync();
    }
}
