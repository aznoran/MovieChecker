using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Entities;

public class WatchEntry
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public Guid UserId { get; set; }
    public int? GroupId { get; set; }

    public WatchStatus Status { get; set; } = WatchStatus.Planned;

    public int? MyRating { get; set; }
    public int? PartnerRating { get; set; }

    public string? Comment { get; set; }
    public string? PrivateComment { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public int? CurrentSeason { get; set; }

    public int? CurrentEpisode { get; set; }

    public int? TotalEpisodes { get; set; }

    public int? WatchingTime { get; set; }

    public int? TotalSeasons { get; set; }

    public int? RuntimeSeconds { get; set; }

    public int? RewatchCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Movie Movie { get; set; } = null!;
    public UserProfile User { get; set; } = null!;
    public Group? Group { get; set; }
    public ICollection<EntryRating> Ratings { get; set; } = [];
    public ICollection<WatchEntryGroup> WatchEntryGroups { get; set; } = [];
}