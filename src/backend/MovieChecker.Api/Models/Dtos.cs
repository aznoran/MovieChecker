namespace MovieChecker.Api.Models;

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
    DateTime? CompletedAt
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
    DateTime? CompletedAt
);

public record WatchEntryDto(
    int Id,
    int MovieId,
    MovieDto Movie,
    WatchStatus Status,
    WatchedBy WatchedBy,
    int? MyRating,
    int? PartnerRating,
    Emotion? Emotion,
    string? Comment,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

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
    Dictionary<string, int> ByEmotion
);
