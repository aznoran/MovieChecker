using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record UpdateMovieRequest(
    string? Title,
    string? Description,
    ContentType? Type,
    int? Year,
    string? Genre,
    string? PosterUrl
);
