namespace MovieChecker.Domain.Models.Dtos;

public record StatsDto(
    int TotalWatched,
    int TotalPlanned,
    int TotalWatching,
    int TotalDropped,
    int TotalConsidering,
    double AverageMyRating,
    double AveragePartnerRating,
    Dictionary<string, int> ByType,
    List<MemberRatingDto> MemberRatings,
    List<ActivityTimelinePoint> ActivityTimeline,
    Dictionary<int, int> RatingDistribution,
    Dictionary<string, int> GenreDistribution,
    List<MemberActivityDto> MemberActivity
);

public record ActivityTimelinePoint(string Date, int Count);
public record MemberActivityDto(Guid UserId, string DisplayName, int TotalEntries);
