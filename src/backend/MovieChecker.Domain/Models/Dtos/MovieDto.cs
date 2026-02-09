using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record MovieDto(
    int Id,
    string Title,
    string? Description,
    ContentType Type,
    int? Year,
    string? Genre,
    string? PosterUrl,
    DateTime CreatedAt
);
