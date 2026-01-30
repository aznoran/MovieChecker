using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

public static class GroupEndpoints
{
    public static void MapGroupEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/groups").RequireAuthorization();

        group.MapGet("/", GetMyGroups);
        group.MapGet("/{id:int}", GetGroup);
        group.MapPost("/", CreateGroup);
        group.MapPost("/check-invite", CheckInviteCode);
        group.MapPost("/join", JoinGroup);
        group.MapDelete("/{id:int}/leave", LeaveGroup);
        group.MapDelete("/{id:int}/members/{userId:int}", DeleteUser);
        group.MapPut("/{id:int}/transfer", TransferGroup);
        group.MapPut("/{id:int}/members/{userId:int}/role", UpdateMemberRole);
        group.MapPost("/{id:int}/generate-otp", GenerateOtp);
        group.MapPut("/{id:int}/password", UpdatePassword);
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

        // Password is optional for private groups (can use OTP instead)
        var g = new Group
        {
            Name = request.Name,
            InviteCode = GenerateInviteCode(),
            CreatedByUserId = userId,
            IsPrivate = request.IsPrivate,
            PasswordHash = !string.IsNullOrWhiteSpace(request.Password) 
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

    private static async Task<IResult> CheckInviteCode(
        JoinGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        // Find the group
        var group = await db.Groups
            .FirstOrDefaultAsync(g => 
                g.InviteCode == request.InviteCode.Trim().ToUpperInvariant());

        if (group == null)
            return Results.Ok(new GroupInfoResponse(false, false, false, null));

        // Check if already a member
        if (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == userId))
            return Results.BadRequest(new { message = "Already a member of this group" });

        // Return group info
        return Results.Ok(new GroupInfoResponse(
            true,
            group.IsPrivate,
            !string.IsNullOrWhiteSpace(group.PasswordHash),
            group.Name
        ));
    }

    private static async Task<IResult> JoinGroup(
        JoinGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        OtpService otpService)
    {
        var userId = GetUserId(user);

        // 1. Find the group
        var group = await db.Groups
            .FirstOrDefaultAsync(g => 
                g.InviteCode == request.InviteCode.Trim().ToUpperInvariant());

        if (group == null)
            return Results.NotFound(new { message = "Invalid invite code" });

        // 2. Check password or OTP for private groups
        if (group.IsPrivate)
        {
            bool authenticated = false;

            // Try OTP first if provided
            if (!string.IsNullOrWhiteSpace(request.Otp))
            {
                authenticated = await otpService.ValidateOtpAsync(group.Id, request.Otp);
                if (!authenticated)
                    return Results.BadRequest(new { message = "Invalid or expired OTP code" });
            }
            // Then try password if group has one
            else if (!string.IsNullOrWhiteSpace(group.PasswordHash))
            {
                if (string.IsNullOrWhiteSpace(request.Password))
                {
                    return Results.BadRequest(new { message = "Password or OTP is required for this private group" });
                }

                if (!BCrypt.Net.BCrypt.Verify(request.Password, group.PasswordHash))
                {
                    return Results.Unauthorized();
                }
                authenticated = true;
            }
            // Group is private but has no password (OTP-only)
            else
            {
                return Results.BadRequest(new { message = "This private group requires an OTP code. Password is disabled." });
            }

            if (!authenticated)
            {
                return Results.Unauthorized();
            }
        }

        // 3. Check membership
        if (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == userId))
            return Results.BadRequest(new { message = "Already a member" });

        // 4. Add member
        db.GroupMembers.Add(new GroupMember 
        { 
            GroupId = group.Id, 
            UserId = userId,
            Role = GroupRole.Member
        });
        await db.SaveChangesAsync();

        var updatedGroup = await db.Groups
            .Include(g => g.Members)
            .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == group.Id);

        if (updatedGroup == null) 
            return Results.NotFound();

        // 5. Return updated group
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

        var group = await db.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null)
            return Results.NotFound();

        db.GroupMembers.Remove(member);

        // If no members left, delete the group
        var remainingMembers = group.Members.Count(m => m.UserId != userId);
        if (remainingMembers == 0)
        {
            db.Groups.Remove(group);
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

        // Admins cannot modify other Admins' or Owner's roles
        if (currentMember.Role == GroupRole.Admin && memberToUpdate.Role >= GroupRole.Admin)
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

    private static async Task<IResult> GenerateOtp(
        int id,
        ClaimsPrincipal user,
        AppDbContext db,
        OtpService otpService)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);

        // Only Owner and Admin can generate OTP
        if (member == null || (member.Role != GroupRole.Owner && member.Role != GroupRole.Admin))
        {
            return Results.Forbid();
        }

        // Group must be private to generate OTP
        if (!group.IsPrivate)
        {
            return Results.BadRequest(new { message = "OTP codes can only be generated for private groups" });
        }

        var (code, expiresAt) = await otpService.GenerateOtpAsync(group.Id);

        return Results.Ok(new GenerateOtpResponse(code, expiresAt));
    }

    private static async Task<IResult> UpdatePassword(
        int id,
        UpdateGroupPasswordRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);

        // Only Owner and Admin can change password
        if (member == null || (member.Role != GroupRole.Owner && member.Role != GroupRole.Admin))
        {
            return Results.Forbid();
        }

        // Group must be private to have a password
        if (!group.IsPrivate)
        {
            return Results.BadRequest(new { message = "Only private groups can have passwords" });
        }

        // Update password (null removes it, making group OTP-only)
        group.PasswordHash = !string.IsNullOrWhiteSpace(request.NewPassword)
            ? BCrypt.Net.BCrypt.HashPassword(request.NewPassword)
            : null;

        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Password updated successfully" });
    }
}
