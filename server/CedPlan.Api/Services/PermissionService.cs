using CedPlan.Api.Data;
using CedPlan.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CedPlan.Api.Services;

public class PermissionService
{
    private readonly AppDbContext _db;

    public PermissionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permissionKey)
    {
        var role = await _db.Users.Where(u => u.Id == userId).Select(u => (SystemRole?)u.Role).FirstOrDefaultAsync();
        if (role == null) return false;
        return await _db.RolePermissions.AnyAsync(rp => rp.Role == role && rp.PermissionKey == permissionKey);
    }

    public async Task<bool> RoleHasPermissionAsync(SystemRole role, string permissionKey) =>
        await _db.RolePermissions.AnyAsync(rp => rp.Role == role && rp.PermissionKey == permissionKey);

    /// <summary>
    /// Idempotent, additive seeding: inserts any permission (and its default role grants) that isn't
    /// already in the database yet, without touching rows an Admin may have customized via the UI.
    /// </summary>
    public static async Task SeedDefaultsAsync(AppDbContext db)
    {
        var existingKeys = (await db.Permissions.Select(p => p.Key).ToListAsync()).ToHashSet();
        var newKeys = PermissionKeys.All.Where(p => !existingKeys.Contains(p.Key)).ToList();
        foreach (var (key, category, description) in newKeys)
            db.Permissions.Add(new Permission { Key = key, Category = category, Description = description });
        if (newKeys.Count > 0) await db.SaveChangesAsync();

        foreach (var (role, keys) in PermissionKeys.Defaults)
        {
            foreach (var key in keys)
            {
                if (existingKeys.Contains(key)) continue; // only auto-grant brand-new permissions
                var alreadyGranted = await db.RolePermissions.AnyAsync(rp => rp.Role == role && rp.PermissionKey == key);
                if (!alreadyGranted)
                    db.RolePermissions.Add(new RolePermission { Role = role, PermissionKey = key });
            }
        }
        await db.SaveChangesAsync();
    }
}
