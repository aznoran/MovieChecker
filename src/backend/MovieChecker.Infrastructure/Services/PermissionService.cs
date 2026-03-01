using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Infrastructure.Services;

public class PermissionService
{
    /// <summary>
    /// Returns the default permissions for a given role
    /// </summary>
    public static Permission GetRolePermissions(GroupRole role) => role switch
    {
        GroupRole.Viewer => Permission.ViewEntries | Permission.RateSelf,
        GroupRole.Member => Permission.ViewEntries | Permission.CreateEntries
                         | Permission.EditOwnEntries | Permission.DeleteOwnEntries
                         | Permission.RateSelf,
        GroupRole.Admin => Permission.ViewEntries | Permission.CreateEntries
                        | Permission.EditOwnEntries | Permission.EditAllEntries
                        | Permission.DeleteOwnEntries | Permission.DeleteAllEntries
                        | Permission.RateSelf | Permission.RateOthers
                        | Permission.ManageMembers,
        GroupRole.Owner => Permission.ViewEntries | Permission.CreateEntries
                        | Permission.EditOwnEntries | Permission.EditAllEntries
                        | Permission.DeleteOwnEntries | Permission.DeleteAllEntries
                        | Permission.RateSelf | Permission.RateOthers
                        | Permission.ManageMembers | Permission.ManageGroup,
        _ => Permission.None
    };

    /// <summary>
    /// Computes the effective permissions for a group member,
    /// combining role defaults with custom grants/revokes.
    /// </summary>
    public static Permission GetEffectivePermissions(GroupMember member)
    {
        var basePerms = GetRolePermissions(member.Role);
        if (member.CustomPermission != null)
        {
            basePerms |= member.CustomPermission.GrantedPermissions;
            basePerms &= ~member.CustomPermission.RevokedPermissions;
        }
        return basePerms;
    }

    /// <summary>
    /// Loads the group member with custom permissions and computes effective permissions.
    /// Returns null if the user is not a member of the group.
    /// </summary>
    public static async Task<Permission?> GetUserPermissions(AppDbContext db, Guid userId, int groupId)
    {
        var member = await db.GroupMembers
            .Include(m => m.CustomPermission)
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (member == null) return null;
        return GetEffectivePermissions(member);
    }

    /// <summary>
    /// Checks if a user has a specific permission in a group
    /// </summary>
    public static async Task<bool> HasPermission(AppDbContext db, Guid userId, int groupId, Permission permission)
    {
        var perms = await GetUserPermissions(db, userId, groupId);
        if (perms == null) return false;
        return perms.Value.HasFlag(permission);
    }

    /// <summary>
    /// Checks if a user has permission to create entries in a group
    /// </summary>
    public static async Task<bool> CanCreateInGroup(AppDbContext db, Guid userId, int groupId)
    {
        return await HasPermission(db, userId, groupId, Permission.CreateEntries);
    }

    /// <summary>
    /// Checks if a user has permission to edit an entry
    /// </summary>
    public static async Task<bool> CanEditEntry(AppDbContext db, Guid userId, WatchEntry entry)
    {
        // Personal entries (legacy with no group): only owner can edit
        if (!entry.GroupId.HasValue)
        {
            // Check if this entry has any group links via junction table
            var linkedGroupIds = await db.WatchEntryGroups
                .Where(weg => weg.WatchEntryId == entry.Id)
                .Select(weg => weg.GroupId)
                .ToListAsync();

            if (linkedGroupIds.Count == 0)
                return entry.UserId == userId;

            // Check permission in any linked group
            var member = await db.GroupMembers
                .Include(m => m.CustomPermission)
                .Where(m => linkedGroupIds.Contains(m.GroupId) && m.UserId == userId)
                .OrderByDescending(m => m.Role)
                .FirstOrDefaultAsync();

            if (member == null) return false;
            var perms = GetEffectivePermissions(member);
            if (perms.HasFlag(Permission.EditAllEntries)) return true;
            if (perms.HasFlag(Permission.EditOwnEntries)) return entry.UserId == userId;
            return false;
        }

        // Group entries: check permissions
        var groupMember = await db.GroupMembers
            .Include(m => m.CustomPermission)
            .FirstOrDefaultAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);

        if (groupMember == null) return false;
        var memberPerms = GetEffectivePermissions(groupMember);
        if (memberPerms.HasFlag(Permission.EditAllEntries)) return true;
        if (memberPerms.HasFlag(Permission.EditOwnEntries)) return entry.UserId == userId;
        return false;
    }

    /// <summary>
    /// Checks if a user has permission to delete an entry
    /// </summary>
    public static async Task<bool> CanDeleteEntry(AppDbContext db, Guid userId, WatchEntry entry)
    {
        // Personal entries (legacy with no group): only owner can delete
        if (!entry.GroupId.HasValue)
        {
            var linkedGroupIds = await db.WatchEntryGroups
                .Where(weg => weg.WatchEntryId == entry.Id)
                .Select(weg => weg.GroupId)
                .ToListAsync();

            if (linkedGroupIds.Count == 0)
                return entry.UserId == userId;

            var member = await db.GroupMembers
                .Include(m => m.CustomPermission)
                .Where(m => linkedGroupIds.Contains(m.GroupId) && m.UserId == userId)
                .OrderByDescending(m => m.Role)
                .FirstOrDefaultAsync();

            if (member == null) return false;
            var perms = GetEffectivePermissions(member);
            if (perms.HasFlag(Permission.DeleteAllEntries)) return true;
            if (perms.HasFlag(Permission.DeleteOwnEntries)) return entry.UserId == userId;
            return false;
        }

        var groupMember = await db.GroupMembers
            .Include(m => m.CustomPermission)
            .FirstOrDefaultAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);

        if (groupMember == null) return false;
        var memberPerms = GetEffectivePermissions(groupMember);
        if (memberPerms.HasFlag(Permission.DeleteAllEntries)) return true;
        if (memberPerms.HasFlag(Permission.DeleteOwnEntries)) return entry.UserId == userId;
        return false;
    }

    /// <summary>
    /// Checks if a user has permission to view entries in a group
    /// </summary>
    public static async Task<bool> CanViewGroup(AppDbContext db, Guid userId, int groupId)
    {
        return await HasPermission(db, userId, groupId, Permission.ViewEntries);
    }

    /// <summary>
    /// Checks if a user can rate an entry (own rating)
    /// </summary>
    public static async Task<bool> CanRateSelf(AppDbContext db, Guid userId, int groupId)
    {
        return await HasPermission(db, userId, groupId, Permission.RateSelf);
    }

    /// <summary>
    /// Checks if a user can set ratings for other members
    /// </summary>
    public static async Task<bool> CanRateOthers(AppDbContext db, Guid userId, int groupId)
    {
        return await HasPermission(db, userId, groupId, Permission.RateOthers);
    }
}
