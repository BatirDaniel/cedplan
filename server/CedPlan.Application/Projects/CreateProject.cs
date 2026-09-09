using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Creates a project and enrolls its creator as Owner in the same transaction.</summary>
public class CreateProject
{
    private readonly AppDbContext _db;

    public CreateProject(AppDbContext db) => _db = db;

    /// <exception cref="ValidationException">Name/identifier missing, or the identifier is already taken.</exception>
    public async Task<ProjectDto> Handle(Guid creatorId, CreateProjectDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Identifier))
            throw new ValidationException("Numele și identificatorul sunt obligatorii.");

        var slug = dto.Identifier.Trim().ToLowerInvariant().Replace(" ", "-");
        if (await _db.Projects.AnyAsync(p => p.Identifier == slug))
            throw new ValidationException("Există deja un proiect cu acest identificator.");

        var project = new Project
        {
            Name = dto.Name,
            Identifier = slug,
            Description = dto.Description,
            Color = string.IsNullOrWhiteSpace(dto.Color) ? "#2563eb" : dto.Color,
            CreatedById = creatorId
        };
        project.Members.Add(new ProjectMember { ProjectId = project.Id, UserId = creatorId, Role = ProjectRole.Owner });

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        return new ProjectDto(project.Id, project.Name, project.Identifier, project.Description, project.Color, project.IsArchived, project.CreatedAt, 1, 0, 0);
    }
}
