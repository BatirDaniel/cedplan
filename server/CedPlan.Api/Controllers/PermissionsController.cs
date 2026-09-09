using CedPlan.Domain.Enums;
using CedPlan.Infrastructure.Persistence;
using CedPlan.Infrastructure.Persistence.Entities;
using CedPlan.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Controllers;

public record PermissionDto(string Key, string Category, string Description);
public record RolePermissionEntryDto(SystemRole Role, string PermissionKey, bool Granted);
public record UpdateRolePermissionsDto(List<RolePermissionEntryDto> Entries);

[ApiController]
[Authorize]
[Route("api/permissions")]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissions;

    public PermissionsController(AppDbContext db, PermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    [HttpGet]
    public async Task<ActionResult<List<PermissionDto>>> GetAll()
    {
        var items = await _db.Permissions.OrderBy(p => p.Category).ThenBy(p => p.Key).ToListAsync();
        return Ok(items.Select(p => new PermissionDto(p.Key, p.Category, p.Description)).ToList());
    }

    [HttpGet("matrix")]
    public async Task<ActionResult<List<RolePermissionEntryDto>>> GetMatrix()
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.AdminView)) return Forbid();

        var permissions = await _db.Permissions.Select(p => p.Key).ToListAsync();
        var granted = await _db.RolePermissions.Select(rp => new { rp.Role, rp.PermissionKey }).ToListAsync();
        var grantedSet = granted.Select(g => (g.Role, g.PermissionKey)).ToHashSet();

        var roles = new[] { SystemRole.Member, SystemRole.Manager, SystemRole.Admin };
        var matrix = roles
            .SelectMany(role => permissions.Select(key => new RolePermissionEntryDto(role, key, grantedSet.Contains((role, key)))))
            .ToList();

        return Ok(matrix);
    }

    [HttpPut("matrix")]
    public async Task<IActionResult> UpdateMatrix(UpdateRolePermissionsDto dto)
    {
        if (!await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.UsersManageRoles)) return Forbid();

        foreach (var entry in dto.Entries)
        {
            var existing = await _db.RolePermissions
                .FirstOrDefaultAsync(rp => rp.Role == entry.Role && rp.PermissionKey == entry.PermissionKey);

            if (entry.Granted && existing == null)
                _db.RolePermissions.Add(new RolePermission { Role = entry.Role, PermissionKey = entry.PermissionKey });
            else if (!entry.Granted && existing != null)
                _db.RolePermissions.Remove(existing);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
