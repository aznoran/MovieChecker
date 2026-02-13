using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record UpdateWatchEntryRequest(
    WatchStatus? Status,
    decimal? MyRating,
    decimal? PartnerRating,
    Emotion? Emotion,
    string? Comment,
    string? PrivateComment,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    decimal? Rating,
    int? CurrentSeason,
    int? CurrentEpisode,
    int? TotalEpisodes,
    int? WatchingTime,
    List<UserRatingInput>? Ratings,
    List<int>? Viewers
);
