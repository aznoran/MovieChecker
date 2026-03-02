namespace MovieChecker.Domain.Models.Entities;

public class UserProfile
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;

    public ICollection<WatchEntry> WatchEntries { get; set; } = [];
    public ICollection<GroupMember> GroupMemberships { get; set; } = [];
    public ICollection<EntryRating> Ratings { get; set; } = [];
    public UserSettings? Settings { get; set; }
}
