namespace MovieChecker.Domain.Models.Entities;

public class UserSettings
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public bool PreventOthersAddingToMyPersonal { get; set; } = false;
    public bool PreventMeAddingToMyPersonal { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
