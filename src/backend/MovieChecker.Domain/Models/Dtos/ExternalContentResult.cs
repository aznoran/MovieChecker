using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record ExternalContentResult(
    string ExternalId,
    string Source,
    string Title,
    string? Description,
    string? PosterUrl,
    int? Year,
    string? Genres,
    ContentType Type,
    double? Rating,
    int? Episodes,
    int? Seasons
);

public record ExternalSearchResponse(
    List<ExternalContentResult> Results,
    int TotalResults,
    string Source
);
