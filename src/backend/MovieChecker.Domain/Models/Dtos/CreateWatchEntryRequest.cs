using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record CreateWatchEntryRequest(
    int MovieId,
    WatchStatus Status,
    int? MyRating,
    int? PartnerRating,
    Emotion? Emotion,
    string? Comment,
    string? PrivateComment,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int? GroupId,
    int? Rating,
    int? CurrentSeason,
    int? CurrentEpisode,
    int? TotalEpisodes,
    int? WatchingTime,
    List<UserRatingInput>? Ratings,
    List<int>? Viewers
);
