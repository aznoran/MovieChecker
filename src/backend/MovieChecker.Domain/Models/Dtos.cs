namespace MovieChecker.Domain.Models;

// Auth DTOs
public record RegisterRequest(string Username, string Password, string DisplayName);
public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, UserDto User);
public record UserDto(int Id, string Username, string DisplayName);

// Validation result
public record ValidationError(string Field, string Message);
public record ValidationResult(bool IsValid, List<ValidationError> Errors);

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

public record UpdateWatchEntryRequest(
    WatchStatus? Status,
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
    List<UserRatingInput>? Ratings,
    List<int>? Viewers
);

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

public record EntryRatingDto(
    int Id,
    int UserId,
    string DisplayName,
    int Rating
);

// Group DTOs
public record CreateGroupRequest(string Name, bool IsPrivate = false, GroupType? GroupType = null, string? Password = null, GroupRole? DefaultRole = null);
public record JoinGroupRequest(string InviteCode, string? Password = null, string? Otp = null);
public record UpdateGroupPasswordRequest(string? NewPassword);
public record GenerateOtpResponse(string Code, DateTime ExpiresAt);

public sealed record TransferGroupRequest(int NewOwnerId);
public sealed record UpdateMemberRoleRequest(GroupRole Role);

public record GroupDto(
    int Id,
    string Name,
    string InviteCode,
    int CreatedByUserId,
    bool IsPrivate,
    GroupType GroupType,
    GroupRole DefaultRole,
    List<GroupMemberDto> Members,
    DateTime CreatedAt
);

public record GroupMemberDto(
    int UserId,
    string DisplayName,
    GroupRole Role,
    DateTime JoinedAt
);

public record GroupInfoResponse(
    bool Exists,
    bool IsPrivate,
    GroupType? GroupType,
    bool HasPassword,
    string? GroupName
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
    Dictionary<string, int> ByType,
    Dictionary<string, int> ByEmotion,
    List<MemberRatingDto> MemberRatings
);

// User Settings DTOs
public record UserSettingsDto(
    bool PreventOthersAddingToMyPersonal,
    bool PreventMeAddingToMyPersonal
);

public record UpdateUserSettingsRequest(
    bool? PreventOthersAddingToMyPersonal,
    bool? PreventMeAddingToMyPersonal
);
