namespace MovieChecker.Domain.Models;

public enum WatchStatus
{
    Planned,
    Watching,
    Completed,
    Dropped
}

public enum WatchedBy
{
    Me,
    Partner,
    Together,
    Separately
}

public enum Emotion
{
    Joy,
    Sadness,
    Excitement,
    Cringe,
    Confused,
    Neutral
}

public class WatchEntry
{
    public int Id { get; set; }
    public int MovieId { get; set; }
    public int UserId { get; set; }
    public int? GroupId { get; set; }

    public WatchStatus Status { get; set; } = WatchStatus.Planned;
    public WatchedBy WatchedBy { get; set; } = WatchedBy.Together;

    public int? MyRating { get; set; }
    public int? PartnerRating { get; set; }

    public Emotion? Emotion { get; set; }
    public string? Comment { get; set; }
    public string? PrivateComment { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public int? CurrentSeason { get; set; }

    public int? CurrentEpisode { get; set; }

    public int? TotalEpisodes { get; set; }

    public int? WatchingTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Movie Movie { get; set; } = null!;
    public User User { get; set; } = null!;
    public Group? Group { get; set; }
    public ICollection<EntryRating> Ratings { get; set; } = [];
    public ICollection<EntryComment> Comments { get; set; } = [];
}
