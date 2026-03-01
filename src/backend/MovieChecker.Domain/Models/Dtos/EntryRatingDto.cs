namespace MovieChecker.Domain.Models.Dtos;

public record EntryRatingDto(
    int Id,
    Guid UserId,
    string DisplayName,
    int Rating
);
