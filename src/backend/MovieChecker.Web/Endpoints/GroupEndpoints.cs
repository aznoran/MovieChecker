using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class GroupEndpoints
{
    public static void MapGroupEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/groups").RequireAuthorization();

        group.MapGet("/", GetMyGroups);
        group.MapGet("/{id:int}", GetGroup);
        group.MapPost("/", CreateGroup);
        group.MapPost("/join", JoinGroup);
        group.MapDelete("/{id:int}/leave", LeaveGroup);
        group.MapDelete("/{id:int}/members/{userId:int}", DeleteUser);
        group.MapPut("/{id:int}/transfer", TransferGroup);
        group.MapPut("/{id:int}/members/{userId:int}/role", UpdateMemberRole);
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = Random.Shared;
        return new string(Enumerable.Range(0, 8).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }

    private static async Task<IResult> GetMyGroups(ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);

        var groups = await db.Groups
            .Where(g => g.Members.Any(m => m.UserId == userId))
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        var dtos = groups.Select(g => new GroupDto(
            g.Id,
            g.Name,
            g.InviteCode,
            g.CreatedByUserId,
            g.IsPrivate,
            g.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName,
                m.Role,
                m.JoinedAt
            )).ToList(),
            g.CreatedAt
        )).ToList();

        return Results.Ok(dtos);
    }

    private static async Task<IResult> GetGroup(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);

        var g = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id && g.Members.Any(m => m.UserId == userId));

        if (g == null) return Results.NotFound();

        return Results.Ok(new GroupDto(
            g.Id,
            g.Name,
            g.InviteCode,
            g.CreatedByUserId,
            g.IsPrivate,
            g.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName,
                m.Role,
                m.JoinedAt
            )).ToList(),
            g.CreatedAt
        ));
    }

    private static async Task<IResult> CreateGroup(
        CreateGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        var g = new Group
        {
            Name = request.Name,
            InviteCode = GenerateInviteCode(),
            CreatedByUserId = userId,
            IsPrivate = request.IsPrivate,
            PasswordHash = request.IsPrivate && !string.IsNullOrEmpty(request.Password) 
                ? BCrypt.Net.BCrypt.HashPassword(request.Password) 
                : null
        };

        db.Groups.Add(g);
        await db.SaveChangesAsync();

        // Creator is automatically a member with Owner role
        db.GroupMembers.Add(new GroupMember
        {
            GroupId = g.Id,
            UserId = userId,
            Role = GroupRole.Owner
        });
        await db.SaveChangesAsync();

        var displayName = (await db.Users.FindAsync(userId))!.DisplayName;

        return Results.Created($"/api/groups/{g.Id}", new GroupDto(
            g.Id,
            g.Name,
            g.InviteCode,
            g.CreatedByUserId,
            g.IsPrivate,
            [new GroupMemberDto(userId, displayName, GroupRole.Owner, DateTime.UtcNow)],
            g.CreatedAt
        ));
    }

    private static async Task<IResult> JoinGroup(
        JoinGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        // 1. Находим группу
        var group = await db.Groups
            .FirstOrDefaultAsync(g => 
                g.InviteCode == request.InviteCode.Trim().ToUpperInvariant());

        if (group == null)
            return Results.NotFound(new { message = "Invalid invite code" });

        // 2. Проверяем пароль для частных групп
        if (group.IsPrivate)
        {
            if (string.IsNullOrEmpty(request.Password))
            {
                return Results.BadRequest(new { message = "Password is required for private groups" });
            }

            if (string.IsNullOrEmpty(group.PasswordHash) || 
                !BCrypt.Net.BCrypt.Verify(request.Password, group.PasswordHash))
            {
                return Results.Unauthorized();
            }
        }

        // 3. Проверяем членство
        if (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == userId))
            return Results.BadRequest(new { message = "Already a member" });

        // 4. Добавляем участника
        db.GroupMembers.Add(new GroupMember 
        { 
            GroupId = group.Id, 
            UserId = userId,
            Role = GroupRole.Member
        });
        await db.SaveChangesAsync();

        var updatedGroup = await db.Groups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)  // ✅ Гарантирует загрузку User для ВСЕХ участников
            .FirstOrDefaultAsync(g => g.Id == group.Id);

        if (updatedGroup == null) 
            return Results.NotFound();

        // 5. Теперь безопасно формируем ответ
        return Results.Ok(new GroupDto(
            updatedGroup.Id,
            updatedGroup.Name,
            updatedGroup.InviteCode,
            updatedGroup.CreatedByUserId,
            updatedGroup.IsPrivate,
            updatedGroup.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt
            )).ToList(),
            updatedGroup.CreatedAt
        ));
    }

    private static async Task<IResult> LeaveGroup(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);

        var member = await db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId);

        if (member == null)
            return Results.NotFound();

        db.GroupMembers.Remove(member);

        // If no members left, delete the group
        var remainingMembers = await db.GroupMembers.CountAsync(m => m.GroupId == id && m.UserId != userId);
        if (remainingMembers == 0)
        {
            var g = await db.Groups.FindAsync(id);
            if (g != null) db.Groups.Remove(g);
        }

        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> DeleteUser(int id, int userId, ClaimsPrincipal user, AppDbContext db)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);
        
        // Only Owner and Admin can delete members
        if (currentMember == null || (currentMember.Role != GroupRole.Owner && currentMember.Role != GroupRole.Admin))
        {
            return Results.Forbid();
        }

        // Cannot delete the owner
        var memberToDelete = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (memberToDelete == null)
            return Results.NotFound();

        if (memberToDelete.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new { message = "Cannot remove the group owner" });
        }

        db.GroupMembers.Remove(memberToDelete);

        // If no members left, delete the group
        var remainingMembers = await db.GroupMembers.CountAsync(m => m.GroupId == id && m.UserId != userId);
        if (remainingMembers == 0)
        {
            var g = await db.Groups.FindAsync(id);
            if (g != null) db.Groups.Remove(g);
        }

        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> TransferGroup(int id, TransferGroupRequest request, ClaimsPrincipal user, AppDbContext db)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return Results.NotFound();

        // Validation: caller must be current owner
        if (group.CreatedByUserId != currentUserId)
            return Results.Forbid();

        // Validation: new owner must be a member of the group
        var newOwnerMember = group.Members.FirstOrDefault(m => m.UserId == request.NewOwnerId);
        if (newOwnerMember == null)
            return Results.BadRequest(new { message = "newOwnerId must be a member of the group" });

        // Action: transfer ownership
        group.CreatedByUserId = request.NewOwnerId;
        
        // Update roles: old owner becomes Admin, new owner becomes Owner
        var oldOwnerMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (oldOwnerMember != null)
        {
            oldOwnerMember.Role = GroupRole.Admin;
        }
        newOwnerMember.Role = GroupRole.Owner;
        
        await db.SaveChangesAsync();

        // Response: 200 OK with updated group DTO (or change to Results.NoContent() if you prefer 204)
        return Results.Ok(new GroupDto(
            group.Id,
            group.Name,
            group.InviteCode,
            group.CreatedByUserId,
            group.IsPrivate,
            group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt
            )).ToList(),
            group.CreatedAt
        ));
    }

    private static async Task<IResult> UpdateMemberRole(
        int id,
        int userId,
        UpdateMemberRoleRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);

        // Only Owner and Admin can update roles
        if (currentMember == null || (currentMember.Role != GroupRole.Owner && currentMember.Role != GroupRole.Admin))
        {
            return Results.Forbid();
        }

        var memberToUpdate = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (memberToUpdate == null)
            return Results.NotFound(new { message = "User is not a member of this group" });

        // Cannot change owner's role
        if (memberToUpdate.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new { message = "Cannot change the owner's role. Use transfer ownership instead." });
        }

        // Admins cannot promote to Owner
        if (currentMember.Role == GroupRole.Admin && request.Role == GroupRole.Owner)
        {
            return Results.Forbid();
        }

        // Cannot set role to Owner
        if (request.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new { message = "Use transfer ownership to make someone owner" });
        }

        memberToUpdate.Role = request.Role;
        await db.SaveChangesAsync();

        return Results.Ok(new GroupDto(
            group.Id,
            group.Name,
            group.InviteCode,
            group.CreatedByUserId,
            group.IsPrivate,
            group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt
            )).ToList(),
            group.CreatedAt
        ));
    }
}
