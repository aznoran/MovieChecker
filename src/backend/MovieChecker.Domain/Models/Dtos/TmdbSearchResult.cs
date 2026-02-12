namespace MovieChecker.Domain.Models.Dtos;

public record TmdbSearchResult(
    int Id,
    string Title,
    string? Overview,
    string? PosterPath,
    string? BackdropPath,
    int? ReleaseYear,
    double VoteAverage,
    int VoteCount,
    List<int> GenreIds,
    string MediaType
);

public record TmdbSearchResponse(
    int Page,
    List<TmdbSearchResult> Results,
    int TotalPages,
    int TotalResults
);

public record TmdbMovieDetails(
    int Id,
    string Title,
    string? Overview,
    string? PosterPath,
    string? BackdropPath,
    int? ReleaseYear,
    double VoteAverage,
    int VoteCount,
    List<TmdbGenre> Genres,
    int? Runtime,
    string? Status,
    string? Tagline
);

public record TmdbTvDetails(
    int Id,
    string Name,
    string? Overview,
    string? PosterPath,
    string? BackdropPath,
    int? FirstAirYear,
    double VoteAverage,
    int VoteCount,
    List<TmdbGenre> Genres,
    int? NumberOfSeasons,
    int? NumberOfEpisodes,
    string? Status,
    string? Tagline
);

public record TmdbGenre(
    int Id,
    string Name
);

public record TmdbConfiguration(
    TmdbImagesConfig Images
);

public record TmdbImagesConfig(
    string BaseUrl,
    string SecureBaseUrl,
    List<string> PosterSizes,
    List<string> BackdropSizes
);
