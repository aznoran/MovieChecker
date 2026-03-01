using MovieChecker.Domain.Models.Enums;

namespace MovieChecker.Domain.Models.Entities;

/// <summary>
/// Stores additional permissions granted to a group member beyond their role's defaults.
/// </summary>
public class MemberPermission
{
    public int Id { get; set; }
    public int GroupMemberId { get; set; }

    /// <summary>Additional permissions granted beyond role defaults</summary>
    public Permission GrantedPermissions { get; set; } = Permission.None;

    /// <summary>Permissions explicitly revoked from role defaults</summary>
    public Permission RevokedPermissions { get; set; } = Permission.None;

    public GroupMember GroupMember { get; set; } = null!;
}
