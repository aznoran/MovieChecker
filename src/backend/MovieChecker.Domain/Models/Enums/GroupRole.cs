namespace MovieChecker.Domain.Models.Enums;

public enum GroupRole
{
    Viewer = 0,   // Can only view
    Member = 1,   // Can create and edit own entries
    Admin = 2,    // Can edit all entries, manage members
    Owner = 3     // Full control
}
