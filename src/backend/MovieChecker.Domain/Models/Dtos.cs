namespace MovieChecker.Domain.Models;

// Auth DTOs
public record RegisterRequest(string Username, string Password, string DisplayName);
public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, UserDto User);
public record UserDto(int Id, string Username, string DisplayName);

// Movie DTOs
public record CreateMovieRequest(
    string Title,
    string? Description,
    ContentType Type,
    int? Year,
    string? Genre,
    string? PosterUrl
);

public record UpdateMovieRequest(
    string? Title,
    string? Description,
    ContentType? Type,
    int? Year,
    string? Genre,
    string? PosterUrl
);

public record MovieDto(
    int Id,
    string Title,
    string? Description,
    ContentType Type,
    int? Year,
    string? Genre,
    string? PosterUrl,
    DateTime CreatedAt
);

// WatchEntry DTOs
public record UserRatingInput(int UserId, int Rating);

public record CreateWatchEntryRequest(
    int MovieId,
    WatchStatus Status,
    WatchedBy WatchedBy,
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
    List<UserRatingInput>? Ratings
);

public record UpdateWatchEntryRequest(
    WatchStatus? Status,
    WatchedBy? WatchedBy,
    int? MyRating,
    int? PartnerRating,
    Emotion? Emotion,
    string? Comment,
    string? PrivateComment,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    int? Rating,
    int? CurrentSeason,
    int? CurrentEpisode,
    int? TotalEpisodes,
    int? WatchingTime,
    List<UserRatingInput>? Ratings
);

public record WatchEntryDto(
    int Id,
    int MovieId,
    MovieDto Movie,
    WatchStatus Status,
    WatchedBy WatchedBy,
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
    int? WatchingTime,
    EntryCommentDto? LastComment
);

public record EntryRatingDto(
    int Id,
    int UserId,
    string DisplayName,
    int Rating
);

public record EntryCommentDto(
    int Id,
    int UserId,
    string DisplayName,
    string Text,
    DateTime CreatedAt
);

public record CreateCommentRequest(string Text);

// Group DTOs
public record CreateGroupRequest(string Name);
public record JoinGroupRequest(string InviteCode);

public sealed record TransferGroupRequest(int NewOwnerId);

public record GroupDto(
    int Id,
    string Name,
    string InviteCode,
    int CreatedByUserId,
    List<GroupMemberDto> Members,
    DateTime CreatedAt
);

public record GroupMemberDto(
    int UserId,
    string DisplayName,
    DateTime JoinedAt
);

public record MemberRatingDto(int UserId, string DisplayName, int AverageRating, int TotalRated);
// Stats DTOs
public record StatsDto(
    int TotalWatched,
    int TotalPlanned,
    int TotalWatching,
    int TotalDropped,
    double AverageMyRating,
    double AveragePartnerRating,
    int WatchedTogether,
    Dictionary<string, int> ByType,
    Dictionary<string, int> ByEmotion,
    List<MemberRatingDto> MemberRatings
);
