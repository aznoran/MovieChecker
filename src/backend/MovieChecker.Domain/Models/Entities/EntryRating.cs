namespace MovieChecker.Domain.Models.Entities;

public class EntryRating
{
    public int Id { get; set; }
    public int WatchEntryId { get; set; }
    public int UserId { get; set; }
    public decimal Rating { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public WatchEntry WatchEntry { get; set; } = null!;
    public User User { get; set; } = null!;
}
