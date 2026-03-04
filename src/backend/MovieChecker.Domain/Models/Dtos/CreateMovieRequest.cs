using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record CreateMovieRequest(
    string Title,
    string? Description,
    EntryContentType Type,
    int? Year,
    string? Genre,
    string? PosterUrl,
    int? TmdbId = null,
    int? AnilistId = null,
    bool IsCustom = true
);
