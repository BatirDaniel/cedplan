namespace CedPlan.Api.Models;

public enum WikiNodeType
{
    Folder = 0,
    Page = 1,
}

public class WikiPage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }
    public WikiNodeType NodeType { get; set; } = WikiNodeType.Page;
    public Guid? ParentId { get; set; }
    public WikiPage? Parent { get; set; }
    public ICollection<WikiPage> Children { get; set; } = new List<WikiPage>();
    public double Position { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public Guid CreatedById { get; set; }
    public ApplicationUser? CreatedBy { get; set; }
    public Guid UpdatedById { get; set; }
    public ApplicationUser? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
