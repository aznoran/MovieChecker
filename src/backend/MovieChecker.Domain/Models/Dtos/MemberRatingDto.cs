namespace MovieChecker.Domain.Models.Dtos;

public record MemberRatingDto(int UserId, string DisplayName, decimal AverageRating, int TotalRated);
