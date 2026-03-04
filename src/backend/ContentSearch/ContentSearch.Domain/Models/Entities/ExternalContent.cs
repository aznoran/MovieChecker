using ContentSearch.Domain.Models.Enums;

namespace ContentSearch.Domain.Models.Entities;

public class ExternalContent
{
    public int Id { get; set; }
    public int ExternalId { get; set; }
    public ContentProvider Provider { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? Year { get; set; }
    public string? Genre { get; set; }
    public string? PosterUrl { get; set; }
    public int? TotalSeasons { get; set; }
    public int? TotalEpisodes { get; set; }
    public int? RuntimeMinutes { get; set; }
    public string SuggestedType { get; set; } = string.Empty;
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}
