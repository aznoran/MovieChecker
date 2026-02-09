namespace MovieChecker.Domain.Models.Dtos;

public record EntryRatingDto(
    int Id,
    int UserId,
    string DisplayName,
    int Rating
);
