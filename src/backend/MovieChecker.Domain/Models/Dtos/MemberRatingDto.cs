namespace MovieChecker.Domain.Models.Dtos;

public record MemberRatingDto(int UserId, string DisplayName, int AverageRating, int TotalRated);
