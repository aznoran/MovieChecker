using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Entities;

public class Movie
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ContentType Type { get; set; } = ContentType.Movie;
    public int? Year { get; set; }
    public string? Genre { get; set; }
    public string? PosterUrl { get; set; }
    public string? TmdbId { get; set; }
    public string? AnilistId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WatchEntry> WatchEntries { get; set; } = [];
}
