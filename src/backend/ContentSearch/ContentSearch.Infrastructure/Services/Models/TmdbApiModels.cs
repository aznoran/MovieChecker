using System.Text.Json.Serialization;

namespace ContentSearch.Infrastructure.Services.Models;

public class TmdbSearchResponse
{
    [JsonPropertyName("results")] public List<TmdbApiResult> Results { get; set; } = [];
}

/// <summary>
/// Unified model for both TMDB movie and TV search results.
/// Movie uses title/original_title/release_date; TV uses name/original_name/first_air_date.
/// </summary>
public class TmdbApiResult
{
    [JsonPropertyName("id")] public int Id { get; set; }

    // Movie fields
    [JsonPropertyName("title")] public string? Title { get; set; }
    [JsonPropertyName("original_title")] public string? OriginalTitle { get; set; }
    [JsonPropertyName("release_date")] public string? ReleaseDate { get; set; }

    // TV fields
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("original_name")] public string? OriginalName { get; set; }
    [JsonPropertyName("first_air_date")] public string? FirstAirDate { get; set; }

    // Shared fields
    [JsonPropertyName("original_language")] public string? OriginalLanguage { get; set; }
    [JsonPropertyName("overview")] public string? Overview { get; set; }
    [JsonPropertyName("popularity")] public double? Popularity { get; set; }
    [JsonPropertyName("vote_average")] public double? VoteAverage { get; set; }
    [JsonPropertyName("vote_count")] public int? VoteCount { get; set; }
    [JsonPropertyName("adult")] public bool Adult { get; set; }
    [JsonPropertyName("video")] public bool Video { get; set; }
    [JsonPropertyName("backdrop_path")] public string? BackdropPath { get; set; }
    [JsonPropertyName("poster_path")] public string? PosterPath { get; set; }
    [JsonPropertyName("genre_ids")] public List<int>? GenreIds { get; set; }
    [JsonPropertyName("origin_country")] public List<string>? OriginCountry { get; set; }
}
