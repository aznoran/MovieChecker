namespace MovieChecker.Domain.Models.Entities;

public class InviteLink
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int UseCount { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Group Group { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
}
