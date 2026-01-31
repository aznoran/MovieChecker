namespace MovieChecker.Domain.Models;

public class UserSettings
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public bool PreventAutoAddToPersonal { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
