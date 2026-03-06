namespace ContentSearch.Domain.Models.Entities;

public class AniListContent
{
    public int Id { get; set; }
    public int AnilistId { get; set; }
    public string? TitleRomaji { get; set; }
    public string? TitleEnglish { get; set; }
    public string? TitleNative { get; set; }
    public string? Description { get; set; }
    public int? SeasonYear { get; set; }
    public string? Season { get; set; }
    public string? Format { get; set; }
    public string? Status { get; set; }
    public int? Episodes { get; set; }
    public int? Duration { get; set; }
    public List<string>? Genres { get; set; }
    public List<string>? Tags { get; set; }
    public string? CoverImageLarge { get; set; }
    public string? CoverImageMedium { get; set; }
    public string? CoverImageExtraLarge { get; set; }
    public string? BannerImage { get; set; }
    public int? AverageScore { get; set; }
    public int? MeanScore { get; set; }
    public int? Popularity { get; set; }
    public int? Favourites { get; set; }
    public int? StartDateYear { get; set; }
    public int? StartDateMonth { get; set; }
    public int? StartDateDay { get; set; }
    public int? EndDateYear { get; set; }
    public int? EndDateMonth { get; set; }
    public int? EndDateDay { get; set; }
    public string? Source { get; set; }
    public string? CountryOfOrigin { get; set; }
    public bool IsAdult { get; set; }
    public string? SiteUrl { get; set; }
    public DateTime CachedAt { get; set; } = DateTime.UtcNow;
}
