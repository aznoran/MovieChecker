using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record UpdateWatchEntryRequest(
    WatchStatus? Status,
    string? Comment,
    string? PrivateComment,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int? CurrentSeason,
    int? CurrentEpisode,
    int? TotalEpisodes,
    int? WatchingTime,
    List<int>? Viewers
);
