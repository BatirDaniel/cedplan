using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Application.WorkPackages;

/// <summary>Creates a work package, assigns it its per-project ticket sequence and board position, and
/// notifies any assignees.</summary>
public class CreateWorkPackage
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public CreateWorkPackage(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    /// <exception cref="ValidationException">The subject is empty.</exception>
    public async Task<WorkPackageDto> Handle(Guid projectId, Guid authorId, CreateWorkPackageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Subject))
            throw new ValidationException("Titlul este obligatoriu.");

        var maxPos = await _db.WorkPackages.Where(w => w.ProjectId == projectId && w.Status == dto.Status)
            .Select(w => (double?)w.Position).MaxAsync() ?? 0;
        var nextSeq = await _db.WorkPackages.Where(w => w.ProjectId == projectId)
            .Select(w => (int?)w.Sequence).MaxAsync() ?? 0;

        var wp = new WorkPackage
        {
            ProjectId = projectId,
            Sequence = nextSeq + 1,
            Subject = dto.Subject,
            Description = dto.Description,
            Type = dto.Type,
            Status = dto.Status,
            Priority = dto.Priority,
            ParentId = dto.ParentId,
            StartDate = dto.StartDate,
            DueDate = dto.DueDate,
            EstimatedHours = dto.EstimatedHours,
            AuthorId = authorId,
            Position = maxPos + 1024
        };
        _db.WorkPackages.Add(wp);
        await _db.SaveChangesAsync();

        await WorkPackageMapper.SetAssigneesAsync(_db, wp, dto.AssigneeIds);
        await _db.SaveChangesAsync();

        await _db.Entry(wp).Reference(w => w.Author).LoadAsync();
        await _db.Entry(wp).Collection(w => w.Assignees).Query().Include(a => a.User).LoadAsync();
        if (wp.ParentId != null) await _db.Entry(wp).Reference(w => w.Parent).LoadAsync();

        if (dto.AssigneeIds is { Count: > 0 })
        {
            await _notifications.NotifyManyAsync(
                dto.AssigneeIds, wp.AuthorId, "taskAssigned",
                $"{wp.Author?.FullName} ți-a atribuit o sarcină",
                wp.Subject, projectId, wp.Id);
        }

        return WorkPackageMapper.ToDto(wp);
    }
}
