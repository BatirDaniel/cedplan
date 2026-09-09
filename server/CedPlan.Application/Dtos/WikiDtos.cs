using CedPlan.Domain.Enums;

namespace CedPlan.Application.Dtos;

public record WikiPageDto(
    Guid Id, Guid ProjectId, WikiNodeType NodeType, Guid? ParentId, double Position,
    string Title, string Slug, string Content,
    Guid CreatedById, string CreatedByName, string UpdatedByName,
    DateTime CreatedAt, DateTime UpdatedAt);
public record CreateWikiPageDto(string Title, string Content, WikiNodeType NodeType, Guid? ParentId);
public record UpdateWikiPageDto(string Title, string Content);
public record MoveWikiNodeDto(Guid? NewParentId);
public record WikiPageVersionSummaryDto(Guid Id, string Title, string SavedByName, DateTime CreatedAt);
public record WikiPageVersionDto(Guid Id, string Title, string Content, string SavedByName, DateTime CreatedAt);
