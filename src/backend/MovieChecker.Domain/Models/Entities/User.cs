namespace MovieChecker.Domain.Models.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AuthentikId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WatchEntry> WatchEntries { get; set; } = [];
    public ICollection<GroupMember> GroupMemberships { get; set; } = [];
    public ICollection<EntryRating> Ratings { get; set; } = [];
    public UserSettings? Settings { get; set; }
}
