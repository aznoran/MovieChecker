namespace ContentSearch.Domain.Models.Entities;

public class TmdbContent
{
    public int Id { get; set; }
    public int TmdbId { get; set; }
    public string MediaType { get; set; } = string.Empty; // "movie" or "tv"
    public string Title { get; set; } = string.Empty;
    public string? OriginalTitle { get; set; }
    public string? OriginalLanguage { get; set; }
    public string? Overview { get; set; }
    public string? ReleaseDate { get; set; }
    public double? Popularity { get; set; }
    public double? VoteAverage { get; set; }
    public int? VoteCount { get; set; }
    public bool Adult { get; set; }
    public bool Video { get; set; }
    public string? BackdropPath { get; set; }
    public string? PosterPath { get; set; }
    public List<int>? GenreIds { get; set; }
    public List<string>? OriginCountry { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}
