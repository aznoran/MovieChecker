using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Dtos;

public record WatchEntryDto(
    int Id,
    int MovieId,
    MovieDto Movie,
    WatchStatus Status,
    int? GroupId,
    Emotion? Emotion,
    string? Comment,
    List<EntryRatingDto> Ratings,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int? CurrentSeason,
    int? CurrentEpisode,
    int? TotalEpisodes,
    int? WatchingTime
);
