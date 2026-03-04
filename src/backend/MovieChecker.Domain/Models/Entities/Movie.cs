using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Entities;

public class Movie
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public EntryContentType Type { get; set; } = EntryContentType.Movie;
    public int? Year { get; set; }
    public string? Genre { get; set; }
    public string? PosterUrl { get; set; }
    public int? TmdbId { get; set; }
    public int? AnilistId { get; set; }
    public bool IsCustom { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WatchEntry> WatchEntries { get; set; } = [];
}
