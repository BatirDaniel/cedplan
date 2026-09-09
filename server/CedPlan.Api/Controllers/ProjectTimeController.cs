using CedPlan.Api.Data;
using CedPlan.Api.Dtos;
using CedPlan.Api.Models;
using CedPlan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/time-entries")]
public class ProjectTimeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissions;

    public ProjectTimeController(AppDbContext db, PermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    [HttpGet]
    public async Task<ActionResult<List<TimeEntryDto>>> GetAll(Guid projectId)
    {
        var isMember = await _db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == this.GetUserId())
            || await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.ProjectsManageAny);
        if (!isMember) return Forbid();

        var entries = await _db.TimeEntries
            .Where(t => t.WorkPackage!.ProjectId == projectId)
            .Include(t => t.User)
            .Include(t => t.WorkPackage)
            .OrderByDescending(t => t.SpentOn)
            .Select(t => new TimeEntryDto(t.Id, t.WorkPackageId, t.WorkPackage!.Subject, t.UserId, t.User!.FullName, t.Hours, t.SpentOn, t.Comment, t.CreatedAt))
            .ToListAsync();

        return Ok(entries);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TimeEntryDto>> Update(Guid projectId, Guid id, UpdateTimeEntryDto dto)
    {
        if (dto.Hours <= 0) return BadRequest(new { message = "Numărul de ore trebuie să fie pozitiv." });

        var userId = this.GetUserId();
        var entry = await _db.TimeEntries
            .Include(t => t.WorkPackage)
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id && t.WorkPackage!.ProjectId == projectId);
        if (entry == null) return NotFound();
        if (entry.UserId != userId) return Forbid();

        entry.Hours = dto.Hours;
        entry.SpentOn = dto.SpentOn;
        entry.Comment = dto.Comment;
        await _db.SaveChangesAsync();

        return Ok(new TimeEntryDto(entry.Id, entry.WorkPackageId, entry.WorkPackage!.Subject, entry.UserId, entry.User!.FullName, entry.Hours, entry.SpentOn, entry.Comment, entry.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id)
    {
        var userId = this.GetUserId();
        var entry = await _db.TimeEntries
            .Include(t => t.WorkPackage)
            .FirstOrDefaultAsync(t => t.Id == id && t.WorkPackage!.ProjectId == projectId);
        if (entry == null) return NotFound();
        if (entry.UserId != userId) return Forbid();

        _db.TimeEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
