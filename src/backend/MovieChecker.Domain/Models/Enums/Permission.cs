namespace MovieChecker.Domain.Models.Enums;

/// <summary>
/// Fine-grained permissions that can be derived from roles or granted individually
/// </summary>
[Flags]
public enum Permission
{
    None = 0,

    /// <summary>View entries in the group</summary>
    ViewEntries = 1 << 0,

    /// <summary>Create new entries</summary>
    CreateEntries = 1 << 1,

    /// <summary>Edit own entries</summary>
    EditOwnEntries = 1 << 2,

    /// <summary>Edit any entry in the group</summary>
    EditAllEntries = 1 << 3,

    /// <summary>Delete own entries</summary>
    DeleteOwnEntries = 1 << 4,

    /// <summary>Delete any entry in the group</summary>
    DeleteAllEntries = 1 << 5,

    /// <summary>Rate entries (own rating only)</summary>
    RateSelf = 1 << 6,

    /// <summary>Set/change ratings for other members</summary>
    RateOthers = 1 << 7,

    /// <summary>Manage group members (kick, change roles)</summary>
    ManageMembers = 1 << 8,

    /// <summary>Manage group settings (name, privacy, password)</summary>
    ManageGroup = 1 << 9,
}
