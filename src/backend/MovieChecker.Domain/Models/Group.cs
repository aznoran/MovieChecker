namespace MovieChecker.Domain.Models;

public enum GroupRole
{
    Viewer = 0,   // Can only view
    Member = 1,   // Can create and edit own entries
    Admin = 2,    // Can edit all entries, manage members
    Owner = 3     // Full control
}

public enum GroupType
{
    Public = 0,   // Public group - anyone can view
    Private = 1,  // Private group - requires password/OTP to join
    Personal = 2  // Personal group - single user's private watch list
}

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? InviteCode { get; set; }  // Nullable - personal groups don't need invite codes
    public int CreatedByUserId { get; set; }
    public bool IsPrivate { get; set; } = false;  // Keep for migration transition
    public GroupType GroupType { get; set; } = GroupType.Public;
    public string? PasswordHash { get; set; }
    public GroupRole DefaultRole { get; set; } = GroupRole.Member;
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
