namespace MovieChecker.Domain.Models.Entities;

public class WatchEntryGroup
{
    public int Id { get; set; }
    public int WatchEntryId { get; set; }
    public int GroupId { get; set; }

    public WatchEntry WatchEntry { get; set; } = null!;
    public Group Group { get; set; } = null!;
}
