namespace MovieChecker.Domain.Models.Dtos;

public record AniListSearchResult(
    int Id,
    string TitleRomaji,
    string? TitleEnglish,
    string? TitleNative,
    string? Description,
    AniListCoverImage? CoverImage,
    int? AverageScore,
    int? Episodes,
    string? Format,
    int? StartYear,
    List<string> Genres
);

public record AniListSearchResponse(
    List<AniListSearchResult> Results
);

public record AniListCoverImage(
    string? Large,
    string? Medium
);

public record AniListAnimeDetails(
    int Id,
    string TitleRomaji,
    string? TitleEnglish,
    string? TitleNative,
    string? Description,
    AniListCoverImage? CoverImage,
    int? AverageScore,
    int? Episodes,
    string? Format,
    int? StartYear,
    int? EndYear,
    List<string> Genres,
    string? Status
);
