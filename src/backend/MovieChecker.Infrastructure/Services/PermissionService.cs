using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Infrastructure.Services;

public class PermissionService
{
    /// <summary>
    /// Checks if a user has permission to create entries in a group
    /// </summary>
    public static async Task<bool> CanCreateInGroup(AppDbContext db, int userId, int groupId)
    {
        var member = await db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (member == null) return false;

        // Viewer cannot create
        return member.Role >= GroupRole.Member;
    }

    /// <summary>
    /// Checks if a user has permission to edit an entry
    /// </summary>
    public static async Task<bool> CanEditEntry(AppDbContext db, int userId, WatchEntry entry)
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

            // Check role in any linked group
            var member = await db.GroupMembers
                .Where(m => linkedGroupIds.Contains(m.GroupId) && m.UserId == userId)
                .OrderByDescending(m => m.Role)
                .FirstOrDefaultAsync();

            if (member == null) return false;
            if (member.Role == GroupRole.Viewer) return false;
            if (member.Role >= GroupRole.Admin) return true;
            return entry.UserId == userId;
        }

        // Group entries: check role
        var groupMember = await db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);

        if (groupMember == null) return false;

        // Viewers cannot edit
        if (groupMember.Role == GroupRole.Viewer) return false;

        // Owner and Admin can edit all entries
        if (groupMember.Role >= GroupRole.Admin) return true;

        // Members can only edit their own entries
        return entry.UserId == userId;
    }

    /// <summary>
    /// Checks if a user has permission to delete an entry
    /// </summary>
    public static async Task<bool> CanDeleteEntry(AppDbContext db, int userId, WatchEntry entry)
    {
        // Same logic as edit
        return await CanEditEntry(db, userId, entry);
    }

    /// <summary>
    /// Checks if a user has permission to view entries in a group
    /// </summary>
    public static async Task<bool> CanViewGroup(AppDbContext db, int userId, int groupId)
    {
        // Any member can view
        return await db.GroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);
    }
}
