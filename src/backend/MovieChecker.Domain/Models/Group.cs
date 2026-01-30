namespace MovieChecker.Domain.Models;

public enum GroupRole
{
    Viewer = 0,   // Can only view
    Member = 1,   // Can create and edit own entries
    Admin = 2,    // Can edit all entries, manage members
    Owner = 3     // Full control
}

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public bool IsPrivate { get; set; } = false;
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedBy { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = [];
}

public class GroupMember
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public int UserId { get; set; }
    public GroupRole Role { get; set; } = GroupRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;
}
