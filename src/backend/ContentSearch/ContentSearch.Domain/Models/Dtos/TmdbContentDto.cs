namespace ContentSearch.Domain.Models.Dtos;

public record TmdbContentDto(
    int TmdbId,
    string MediaType,
    string Title,
    string? OriginalTitle,
    string? OriginalLanguage,
    string? Overview,
    string? ReleaseDate,
    double? Popularity,
    double? VoteAverage,
    int? VoteCount,
    bool Adult,
    bool Video,
    string? BackdropPath,
    string? PosterPath,
    List<int>? GenreIds,
    List<string>? OriginCountry,
    DateTime CachedAt
);
