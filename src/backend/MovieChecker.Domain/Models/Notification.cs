namespace MovieChecker.Domain.Models;

public enum NotificationType
{
    GroupInvite = 0,
    EntryAdded = 1,
    EntryRated = 2,
    MemberJoined = 3,
    System = 4
}

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Optional reference IDs for different notification types
    public int? RelatedId { get; set; }
}
