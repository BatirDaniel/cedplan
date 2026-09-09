using CedPlan.Domain.Enums;

namespace CedPlan.Application.Dtos;

public record CreateProjectDto(string Name, string Identifier, string? Description, string Color);
public record UpdateProjectDto(string Name, string? Description, string Color, bool IsArchived);

public record ProjectDto(
    Guid Id, string Name, string Identifier, string? Description, string Color,
    bool IsArchived, DateTime CreatedAt, int MemberCount, int WorkPackageCount, int OpenWorkPackageCount);

public record ProjectMemberDto(Guid Id, Guid UserId, string FullName, string Email, string AvatarColor, ProjectRole Role);
public record AddMemberDto(string Email, ProjectRole Role);
public record UpdateMemberRoleDto(ProjectRole Role);
