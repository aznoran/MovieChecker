using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Entities;

public class Group
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string InviteCode { get; set; } = string.Empty;
    public int CreatedByUserId { get; set; }
    public bool IsPrivate { get; set; } = false;
    public string? PasswordHash { get; set; }
    public GroupRole DefaultRole { get; set; } = GroupRole.Member;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedBy { get; set; } = null!;
    public ICollection<GroupMember> Members { get; set; } = [];
}
