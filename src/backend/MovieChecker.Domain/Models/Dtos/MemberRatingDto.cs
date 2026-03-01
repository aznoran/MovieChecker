namespace MovieChecker.Domain.Models.Dtos;

public record MemberRatingDto(Guid UserId, string DisplayName, int AverageRating, int TotalRated);
