using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.Projects;

/// <summary>Invites an existing user to a project and notifies them.</summary>
public class AddProjectMember
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public AddProjectMember(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    /// <exception cref="NotFoundException">No user with that email exists.</exception>
    /// <exception cref="ValidationException">That user is already a member.</exception>
    public async Task<ProjectMemberDto> Handle(Guid projectId, Guid actorId, ProjectRole actorRole, AddMemberDto dto)
    {
        // Any Member+ can invite people to the project; only Admin/Owner can hand out Admin/Owner
        // access, so a plain Member inviting someone is capped at the Member role.
        var role = dto.Role;
        if (actorRole < ProjectRole.Admin && role >= ProjectRole.Admin)
            role = ProjectRole.Member;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email)
            ?? throw new NotFoundException("Nu există niciun utilizator cu acest email.");

        if (await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == user.Id))
            throw new ValidationException("Utilizatorul este deja membru al proiectului.");

        var member = new ProjectMember { ProjectId = projectId, UserId = user.Id, Role = role };
        _db.ProjectMembers.Add(member);
        await _db.SaveChangesAsync();

        var project = await _db.Projects.FirstAsync(p => p.Id == projectId);
        var actor = await _db.Users.FindAsync(actorId);
        await _notifications.NotifyAsync(
            user.Id, actorId, "projectMemberChanges",
            $"{actor?.FullName} te-a adăugat în proiectul {project.Name}",
            null, projectId);

        return new ProjectMemberDto(member.Id, user.Id, user.FullName, user.Email!, user.AvatarColor, member.Role);
    }
}
