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
[Route("api/projects/{projectId:guid}/wiki")]
public class WikiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PermissionService _permissions;

    public WikiController(AppDbContext db, PermissionService permissions)
    {
        _db = db;
        _permissions = permissions;
    }

    /// <summary>The caller's role on this project. An Admin with projects.manage_any is a virtual Owner everywhere.</summary>
    private async Task<ProjectRole?> MyRole(Guid projectId)
    {
        var actual = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.UserId == this.GetUserId())
            .Select(m => (ProjectRole?)m.Role)
            .FirstOrDefaultAsync();
        if (actual != null) return actual;

        if (await _permissions.HasPermissionAsync(this.GetUserId(), PermissionKeys.ProjectsManageAny))
            return ProjectRole.Owner;

        return null;
    }

    private async Task<bool> IsMember(Guid projectId) => await MyRole(projectId) != null;

    private async Task<bool> CanEdit(Guid projectId) => await MyRole(projectId) is ProjectRole role && role >= ProjectRole.Member;

    private static string Slugify(string title) =>
        string.Concat(title.Trim().ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-'))
            .Trim('-');

    private static WikiPageDto ToDto(WikiPage w) => new(
        w.Id, w.ProjectId, w.NodeType, w.ParentId, w.Position,
        w.Title, w.Slug, w.Content,
        w.CreatedById, w.CreatedBy?.FullName ?? "", w.UpdatedBy?.FullName ?? "",
        w.CreatedAt, w.UpdatedAt);

    [HttpGet]
    public async Task<ActionResult<List<WikiPageDto>>> GetAll(Guid projectId)
    {
        if (!await IsMember(projectId)) return Forbid();
        var pages = await _db.WikiPages.Where(w => w.ProjectId == projectId)
            .Include(w => w.CreatedBy).Include(w => w.UpdatedBy)
            .OrderBy(w => w.Position).ThenBy(w => w.Title)
            .ToListAsync();
        return Ok(pages.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WikiPageDto>> GetOne(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var w = await _db.WikiPages.Include(w => w.CreatedBy).Include(w => w.UpdatedBy)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (w == null) return NotFound();
        return Ok(ToDto(w));
    }

    [HttpPost]
    public async Task<ActionResult<WikiPageDto>> Create(Guid projectId, CreateWikiPageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Titlul este obligatoriu." });

        if (dto.ParentId != null)
        {
            var parent = await _db.WikiPages.FirstOrDefaultAsync(w => w.Id == dto.ParentId && w.ProjectId == projectId);
            if (parent == null || parent.NodeType != WikiNodeType.Folder)
                return BadRequest(new { message = "Folderul părinte nu a fost găsit." });
        }

        var userId = this.GetUserId();
        var slug = Slugify(dto.Title);
        if (string.IsNullOrEmpty(slug)) slug = "page";
        var suffix = 1;
        var baseSlug = slug;
        while (await _db.WikiPages.AnyAsync(w => w.ProjectId == projectId && w.Slug == slug))
            slug = $"{baseSlug}-{++suffix}";

        var siblingCount = await _db.WikiPages.CountAsync(w => w.ProjectId == projectId && w.ParentId == dto.ParentId);

        var page = new WikiPage
        {
            ProjectId = projectId,
            NodeType = dto.NodeType,
            ParentId = dto.ParentId,
            Position = siblingCount,
            Title = dto.Title,
            Slug = slug,
            Content = dto.Content,
            CreatedById = userId,
            UpdatedById = userId,
        };
        _db.WikiPages.Add(page);
        await _db.SaveChangesAsync();

        page.CreatedBy = page.UpdatedBy = await _db.Users.FindAsync(userId);
        return CreatedAtAction(nameof(GetOne), new { projectId, id = page.Id }, ToDto(page));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WikiPageDto>> Update(Guid projectId, Guid id, UpdateWikiPageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var page = await _db.WikiPages.Include(w => w.CreatedBy).FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (page == null) return NotFound();

        var userId = this.GetUserId();

        // Throttled snapshot: collapse rapid autosaves into at most one version checkpoint per 10 minutes,
        // so autosaving every ~2s doesn't flood the version history.
        var contentChanged = page.Content != dto.Content || page.Title != dto.Title;
        if (contentChanged && DateTime.UtcNow - page.UpdatedAt > TimeSpan.FromMinutes(10))
        {
            _db.WikiPageVersions.Add(new WikiPageVersion
            {
                WikiPageId = page.Id,
                Title = page.Title,
                Content = page.Content,
                SavedById = page.UpdatedById,
                CreatedAt = page.UpdatedAt,
            });
        }

        page.Title = dto.Title;
        page.Content = dto.Content;
        page.UpdatedById = userId;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        page.UpdatedBy = await _db.Users.FindAsync(userId);
        return Ok(ToDto(page));
    }

    [HttpPatch("{id:guid}/move")]
    public async Task<ActionResult<WikiPageDto>> Move(Guid projectId, Guid id, MoveWikiNodeDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var node = await _db.WikiPages.Include(w => w.CreatedBy).Include(w => w.UpdatedBy)
            .FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (node == null) return NotFound();

        if (dto.NewParentId != null)
        {
            if (dto.NewParentId == id) return BadRequest(new { message = "Nu poți muta un element în el însuși." });

            var target = await _db.WikiPages.FirstOrDefaultAsync(w => w.Id == dto.NewParentId && w.ProjectId == projectId);
            if (target == null || target.NodeType != WikiNodeType.Folder)
                return BadRequest(new { message = "Folderul destinație nu a fost găsit." });

            // Walk up from the target, reject if the moved node is one of its own ancestors-to-be.
            var cursor = target.ParentId;
            while (cursor != null)
            {
                if (cursor == id) return BadRequest(new { message = "Nu poți muta un folder într-unul dintre subfolderele sale." });
                cursor = await _db.WikiPages.Where(w => w.Id == cursor).Select(w => w.ParentId).FirstOrDefaultAsync();
            }
        }

        var siblingCount = await _db.WikiPages.CountAsync(w => w.ProjectId == projectId && w.ParentId == dto.NewParentId);
        node.ParentId = dto.NewParentId;
        node.Position = siblingCount;
        node.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ToDto(node));
    }

    [HttpGet("{id:guid}/versions")]
    public async Task<ActionResult<List<WikiPageVersionSummaryDto>>> GetVersions(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var exists = await _db.WikiPages.AnyAsync(w => w.Id == id && w.ProjectId == projectId);
        if (!exists) return NotFound();

        var versions = await _db.WikiPageVersions
            .Where(v => v.WikiPageId == id)
            .Include(v => v.SavedBy)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new WikiPageVersionSummaryDto(v.Id, v.Title, v.SavedBy!.FullName, v.CreatedAt))
            .ToListAsync();
        return Ok(versions);
    }

    [HttpGet("{id:guid}/versions/{versionId:guid}")]
    public async Task<ActionResult<WikiPageVersionDto>> GetVersion(Guid projectId, Guid id, Guid versionId)
    {
        if (!await IsMember(projectId)) return Forbid();
        var version = await _db.WikiPageVersions
            .Include(v => v.SavedBy)
            .FirstOrDefaultAsync(v => v.Id == versionId && v.WikiPageId == id);
        if (version == null) return NotFound();

        return Ok(new WikiPageVersionDto(version.Id, version.Title, version.Content, version.SavedBy!.FullName, version.CreatedAt));
    }

    [HttpPost("{id:guid}/versions/{versionId:guid}/restore")]
    public async Task<ActionResult<WikiPageDto>> RestoreVersion(Guid projectId, Guid id, Guid versionId)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var page = await _db.WikiPages.Include(w => w.CreatedBy).FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (page == null) return NotFound();
        var version = await _db.WikiPageVersions.FirstOrDefaultAsync(v => v.Id == versionId && v.WikiPageId == id);
        if (version == null) return NotFound();

        var userId = this.GetUserId();
        _db.WikiPageVersions.Add(new WikiPageVersion
        {
            WikiPageId = page.Id,
            Title = page.Title,
            Content = page.Content,
            SavedById = page.UpdatedById,
            CreatedAt = page.UpdatedAt,
        });

        page.Title = version.Title;
        page.Content = version.Content;
        page.UpdatedById = userId;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        page.UpdatedBy = await _db.Users.FindAsync(userId);
        return Ok(ToDto(page));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id)
    {
        if (!await CanEdit(projectId)) return Forbid();
        var page = await _db.WikiPages.FirstOrDefaultAsync(w => w.Id == id && w.ProjectId == projectId);
        if (page == null) return NotFound();

        // Folders delete recursively: BFS-collect every descendant id first (Parent FK is Restrict).
        var idsToDelete = new List<Guid> { id };
        var frontier = new List<Guid> { id };
        while (frontier.Count > 0)
        {
            var children = await _db.WikiPages
                .Where(w => w.ProjectId == projectId && w.ParentId != null && frontier.Contains(w.ParentId!.Value))
                .Select(w => w.Id)
                .ToListAsync();
            if (children.Count == 0) break;
            idsToDelete.AddRange(children);
            frontier = children;
        }

        await _db.WikiPageVersions.Where(v => idsToDelete.Contains(v.WikiPageId)).ExecuteDeleteAsync();
        await _db.WikiPages.Where(w => idsToDelete.Contains(w.Id)).ExecuteDeleteAsync();
        return NoContent();
    }
}
