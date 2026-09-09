using CedPlan.Application.Common;
using CedPlan.Application.Dtos;
using CedPlan.Application.WorkPackages;
using CedPlan.Domain.Access;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CedPlan.Api.Controllers;

/// <summary>
/// HTTP surface for work packages, their comments and time entries. Authorization stays here via
/// <see cref="IProjectAccess"/>; business logic and persistence live in the use-case classes under
/// CedPlan.Application.WorkPackages.
/// </summary>
[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/work-packages")]
public class WorkPackagesController : ControllerBase
{
    private readonly IProjectAccess _access;
    private readonly WorkPackageQueries _queries;
    private readonly CreateWorkPackage _create;
    private readonly UpdateWorkPackage _update;
    private readonly MoveWorkPackage _move;
    private readonly UpdateWorkPackageStatus _updateStatus;
    private readonly UpdateWorkPackageSchedule _updateSchedule;
    private readonly DeleteWorkPackage _delete;
    private readonly AddWorkPackageComment _addComment;
    private readonly AddWorkPackageTimeEntry _addTimeEntry;

    public WorkPackagesController(
        IProjectAccess access,
        WorkPackageQueries queries,
        CreateWorkPackage create,
        UpdateWorkPackage update,
        MoveWorkPackage move,
        UpdateWorkPackageStatus updateStatus,
        UpdateWorkPackageSchedule updateSchedule,
        DeleteWorkPackage delete,
        AddWorkPackageComment addComment,
        AddWorkPackageTimeEntry addTimeEntry)
    {
        _access = access;
        _queries = queries;
        _create = create;
        _update = update;
        _move = move;
        _updateStatus = updateStatus;
        _updateSchedule = updateSchedule;
        _delete = delete;
        _addComment = addComment;
        _addTimeEntry = addTimeEntry;
    }

    private Task<bool> IsMember(Guid projectId) => _access.IsMemberAsync(this.GetUserId(), projectId);

    /// <summary>Viewers can look but not touch: creating/editing/assigning/commenting/logging time all need at least Member.</summary>
    private Task<bool> CanEdit(Guid projectId) => _access.CanEditAsync(this.GetUserId(), projectId);

    [HttpGet]
    public async Task<ActionResult<List<WorkPackageDto>>> GetAll(Guid projectId)
    {
        if (!await IsMember(projectId)) return Forbid();
        return Ok(await _queries.ListAll(projectId));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkPackageDto>> GetOne(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        var dto = await _queries.GetOne(projectId, id);
        if (dto == null) return NotFound();
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<WorkPackageDto>> Create(Guid projectId, CreateWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            var result = await _create.Handle(projectId, this.GetUserId(), dto);
            return CreatedAtAction(nameof(GetOne), new { projectId, id = result.Id }, result);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkPackageDto>> Update(Guid projectId, Guid id, UpdateWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            return Ok(await _update.Handle(projectId, id, this.GetUserId(), dto));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPatch("{id:guid}/move")]
    public async Task<IActionResult> Move(Guid projectId, Guid id, MoveWorkPackageDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            await _move.Handle(projectId, id, dto);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<WorkPackageDto>> UpdateStatus(Guid projectId, Guid id, UpdateStatusDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            return Ok(await _updateStatus.Handle(projectId, id, this.GetUserId(), dto));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPatch("{id:guid}/schedule")]
    public async Task<ActionResult<WorkPackageDto>> UpdateSchedule(Guid projectId, Guid id, UpdateScheduleDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            return Ok(await _updateSchedule.Handle(projectId, id, dto));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid projectId, Guid id)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            await _delete.Handle(projectId, id);
            return NoContent();
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
    }

    // Comments
    [HttpGet("{id:guid}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetComments(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        return Ok(await _queries.GetComments(id));
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<ActionResult<CommentDto>> AddComment(Guid projectId, Guid id, CreateCommentDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            return Ok(await _addComment.Handle(projectId, id, this.GetUserId(), dto));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Time entries
    [HttpGet("{id:guid}/time-entries")]
    public async Task<ActionResult<List<TimeEntryDto>>> GetTimeEntries(Guid projectId, Guid id)
    {
        if (!await IsMember(projectId)) return Forbid();
        return Ok(await _queries.GetTimeEntries(id));
    }

    [HttpPost("{id:guid}/time-entries")]
    public async Task<ActionResult<TimeEntryDto>> AddTimeEntry(Guid projectId, Guid id, CreateTimeEntryDto dto)
    {
        if (!await CanEdit(projectId)) return Forbid();

        try
        {
            return Ok(await _addTimeEntry.Handle(id, this.GetUserId(), dto));
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
