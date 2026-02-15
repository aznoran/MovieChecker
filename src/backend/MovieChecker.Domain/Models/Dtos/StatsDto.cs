namespace MovieChecker.Domain.Models.Dtos;

public record StatsDto(
    int TotalWatched,
    int TotalPlanned,
    int TotalWatching,
    int TotalDropped,
    double AverageMyRating,
    double AveragePartnerRating,
    Dictionary<string, int> ByType,
    List<MemberRatingDto> MemberRatings
);
