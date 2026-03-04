using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record MovieDto(
    int Id,
    string Title,
    string? Description,
    EntryContentType Type,
    int? Year,
    string? Genre,
    string? PosterUrl,
    int? TmdbId,
    int? AnilistId,
    bool IsCustom,
    DateTime CreatedAt
);
