namespace CedPlan.Infrastructure.Persistence.Entities;

public class WikiPageVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WikiPageId { get; set; }
    public WikiPage? WikiPage { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public Guid SavedById { get; set; }
    public ApplicationUser? SavedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
