using CedPlan.Api.Models;

namespace CedPlan.Api.Dtos;

public record AssigneeDto(Guid Id, string FullName, string AvatarColor);

public record CreateWorkPackageDto(
    string Subject, string? Description, WorkPackageType Type, WorkPackageStatus Status,
    WorkPackagePriority Priority, Guid? ParentId, List<Guid>? AssigneeIds,
    DateOnly? StartDate, DateOnly? DueDate, double? EstimatedHours);

public record UpdateWorkPackageDto(
    string Subject, string? Description, WorkPackageType Type, WorkPackageStatus Status,
    WorkPackagePriority Priority, Guid? ParentId, List<Guid>? AssigneeIds,
    DateOnly? StartDate, DateOnly? DueDate, double? EstimatedHours, int PercentDone);

public record MoveWorkPackageDto(WorkPackageStatus Status, double Position);

public record UpdateStatusDto(WorkPackageStatus Status);

public record UpdateScheduleDto(DateOnly? StartDate, DateOnly? DueDate);

public record WorkPackageDto(
    Guid Id, Guid ProjectId, int Sequence, string Subject, string? Description,
    WorkPackageType Type, WorkPackageStatus Status, WorkPackagePriority Priority,
    Guid? ParentId, string? ParentSubject,
    Guid AuthorId, string AuthorName,
    List<AssigneeDto> Assignees,
    DateOnly? StartDate, DateOnly? DueDate, double? EstimatedHours, int PercentDone,
    double Position, DateTime CreatedAt, DateTime UpdatedAt, double LoggedHours);

public record CommentDto(
    Guid Id, Guid WorkPackageId, Guid AuthorId, string AuthorName, string AuthorColor,
    string Text, string? ImageUrl, List<Guid> MentionedUserIds, DateTime CreatedAt);
public record CreateCommentDto(string Text, string? ImageUrl, List<Guid>? MentionedUserIds);

public record TimeEntryDto(Guid Id, Guid WorkPackageId, string WorkPackageSubject, Guid UserId, string UserName, double Hours, DateOnly SpentOn, string? Comment, DateTime CreatedAt);
public record CreateTimeEntryDto(double Hours, DateOnly SpentOn, string? Comment);
public record UpdateTimeEntryDto(double Hours, DateOnly SpentOn, string? Comment);
