using System.Text.Json.Serialization;

namespace ContentSearch.Infrastructure.Services.Models;

public class AniListGraphQlResponse
{
    [JsonPropertyName("data")] public AniListDataResult? Data { get; set; }
}

public class AniListDataResult
{
    [JsonPropertyName("Page")] public AniListPageResult? Page { get; set; }
}

public class AniListPageResult
{
    [JsonPropertyName("media")] public List<AniListMediaResult>? Media { get; set; }
}

public class AniListMediaResult
{
    [JsonPropertyName("id")] public int Id { get; set; }
    [JsonPropertyName("title")] public AniListTitleResult? Title { get; set; }
    [JsonPropertyName("description")] public string? Description { get; set; }
    [JsonPropertyName("seasonYear")] public int? SeasonYear { get; set; }
    [JsonPropertyName("season")] public string? Season { get; set; }
    [JsonPropertyName("format")] public string? Format { get; set; }
    [JsonPropertyName("status")] public string? Status { get; set; }
    [JsonPropertyName("episodes")] public int? Episodes { get; set; }
    [JsonPropertyName("duration")] public int? Duration { get; set; }
    [JsonPropertyName("genres")] public List<string>? Genres { get; set; }
    [JsonPropertyName("tags")] public List<AniListTagResult>? Tags { get; set; }
    [JsonPropertyName("coverImage")] public AniListCoverImageResult? CoverImage { get; set; }
    [JsonPropertyName("bannerImage")] public string? BannerImage { get; set; }
    [JsonPropertyName("averageScore")] public int? AverageScore { get; set; }
    [JsonPropertyName("meanScore")] public int? MeanScore { get; set; }
    [JsonPropertyName("popularity")] public int? Popularity { get; set; }
    [JsonPropertyName("favourites")] public int? Favourites { get; set; }
    [JsonPropertyName("startDate")] public AniListDateResult? StartDate { get; set; }
    [JsonPropertyName("endDate")] public AniListDateResult? EndDate { get; set; }
    [JsonPropertyName("source")] public string? Source { get; set; }
    [JsonPropertyName("countryOfOrigin")] public string? CountryOfOrigin { get; set; }
    [JsonPropertyName("isAdult")] public bool IsAdult { get; set; }
    [JsonPropertyName("siteUrl")] public string? SiteUrl { get; set; }
}

public class AniListTitleResult
{
    [JsonPropertyName("romaji")] public string? Romaji { get; set; }
    [JsonPropertyName("english")] public string? English { get; set; }
    [JsonPropertyName("native")] public string? Native { get; set; }
}

public class AniListCoverImageResult
{
    [JsonPropertyName("large")] public string? Large { get; set; }
    [JsonPropertyName("medium")] public string? Medium { get; set; }
    [JsonPropertyName("extraLarge")] public string? ExtraLarge { get; set; }
}

public class AniListDateResult
{
    [JsonPropertyName("year")] public int? Year { get; set; }
    [JsonPropertyName("month")] public int? Month { get; set; }
    [JsonPropertyName("day")] public int? Day { get; set; }
}

public class AniListTagResult
{
    [JsonPropertyName("name")] public string? Name { get; set; }
}
