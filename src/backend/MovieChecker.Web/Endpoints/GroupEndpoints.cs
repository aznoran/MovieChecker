using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Localization;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

public static class GroupEndpoints
{
    public static void MapGroupEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/groups").RequireAuthorization();

        group.MapGet("/", GetMyGroups)
            .Produces<List<GroupDto>>(StatusCodes.Status200OK)
            .WithSummary("Get my groups")
            .WithDescription("Returns all groups the current user is a member of");

        group.MapGet("/{id:int}", GetGroup)
            .Produces<GroupDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get group by ID")
            .WithDescription("Returns a group by its ID if the user is a member");

        group.MapPost("/", CreateGroup)
            .Produces<GroupDto>(StatusCodes.Status201Created)
            .WithSummary("Create a new group")
            .WithDescription("Creates a new group with the current user as owner");

        group.MapPost("/check-invite", CheckInviteCode)
            .Produces<GroupInfoResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Check invite code")
            .WithDescription("Validates an invite code and returns group info");

        group.MapPost("/join", JoinGroup)
            .Produces<GroupDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Join a group")
            .WithDescription("Joins a group using an invite code and password/OTP");

        group.MapDelete("/{id:int}/leave", LeaveGroup)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Leave a group")
            .WithDescription("Leaves a group");

        group.MapDelete("/{id:int}/members/{userId:int}", DeleteUser)
            .Produces(StatusCodes.Status204NoContent)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Remove a member from group")
            .WithDescription("Removes a member from the group (Admin/Owner only)");

        group.MapPut("/{id:int}/transfer", TransferGroup)
            .Produces<GroupDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Transfer group ownership")
            .WithDescription("Transfers group ownership to another member (Owner only)");

        group.MapPut("/{id:int}/members/{userId:int}/role", UpdateMemberRole)
            .Produces<GroupDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status404NotFound)
            .WithSummary("Update member role")
            .WithDescription("Updates a member's role in the group (Admin/Owner only)");

        group.MapPost("/{id:int}/generate-otp", GenerateOtp)
            .Produces<GenerateOtpResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Generate OTP for group")
            .WithDescription("Generates a one-time password for joining a private group");

        group.MapPut("/{id:int}/settings", UpdateGroupSettings)
            .Produces<GroupDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Update group settings")
            .WithDescription("Updates group name and/or privacy settings (Owner/Admin only)");

        group.MapGet("/{id:int}/my-permissions", GetMyPermissions)
            .Produces<PermissionsResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get my permissions for a group")
            .WithDescription("Returns the effective permissions for the current user in a specific group");

        group.MapGet("/{id:int}/members/{userId:int}/permissions", GetMemberPermissions)
            .Produces<MemberPermissionDetailResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get member permissions")
            .WithDescription("Returns detailed permission info for a group member");

        group.MapPut("/{id:int}/members/{userId:int}/permissions", UpdateMemberPermissions)
            .Produces<MemberPermissionDetailResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Update member permissions")
            .WithDescription("Updates custom permissions for a group member (Owner/Admin only)");

        group.MapPost("/{id:int}/invite-links", CreateInviteLink)
            .Produces<InviteLinkDto>(StatusCodes.Status201Created)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Create invite link")
            .WithDescription("Creates a time-limited invite link for a group (Owner/Admin only)");

        group.MapGet("/{id:int}/invite-links", GetInviteLinks)
            .Produces<List<InviteLinkDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get active invite links")
            .WithDescription("Returns all active invite links for a group (Owner/Admin only)");

        group.MapDelete("/{id:int}/invite-links/{linkId:int}", DeleteInviteLink)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Revoke invite link")
            .WithDescription("Revokes an invite link (Owner/Admin only)");
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static string InviteLinkCacheKey(string token) => $"invite_link:{token}";


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
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        var dtos = groups.Select(g => new GroupDto(
            g.Id,
            g.Name,
            g.InviteCode,
            g.CreatedByUserId,
            g.IsPrivate,
            g.GroupType,
            g.DefaultRole,
            g.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
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
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id && g.Members.Any(m => m.UserId == userId));

        if (g == null) return Results.NotFound();

        return Results.Ok(new GroupDto(
            g.Id,
            g.Name,
            g.InviteCode,
            g.CreatedByUserId,
            g.IsPrivate,
            g.GroupType,
            g.DefaultRole,
            g.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
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

        // Validate field lengths
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 50)
            return Results.BadRequest(new ErrorResponse("Group name is required and must not exceed 50 characters"));

        // For public groups, default role must be Viewer
        // For private groups, use the requested default role or default to Member
        var defaultRole = request.IsPrivate
            ? (request.DefaultRole ?? GroupRole.Member)
            : GroupRole.Viewer;

        var g = new Group
        {
            Name = request.Name,
            InviteCode = GenerateInviteCode(),
            CreatedByUserId = userId,
            IsPrivate = request.IsPrivate,
            GroupType = request.IsPrivate ? GroupType.Private : GroupType.Public,
            DefaultRole = defaultRole,
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
            g.GroupType,
            g.DefaultRole,
            [new GroupMemberDto(userId, displayName, GroupRole.Owner, DateTime.UtcNow, false)],
            g.CreatedAt
        ));
    }

    private static async Task<IResult> CheckInviteCode(
        JoinGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        // Find the group
        var group = await db.Groups
            .FirstOrDefaultAsync(g => 
                g.InviteCode == request.InviteCode.Trim().ToUpperInvariant());

        if (group == null)
            return Results.Ok(new GroupInfoResponse(false, false, null));

        // Cannot join personal groups
        if (group.GroupType == GroupType.Personal)
            return Results.BadRequest(new ErrorResponse(localizer["CannotJoinPersonalGroup"]));

        // Check if already a member
        if (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == userId))
            return Results.BadRequest(new ErrorResponse(localizer["AlreadyMember"]));

        // Return group info
        return Results.Ok(new GroupInfoResponse(
            true,
            group.IsPrivate,
            group.Name
        ));
    }

    private static async Task<IResult> JoinGroup(
        JoinGroupRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        OtpService otpService,
        HybridCache cache,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        // 1. Find the group - either by invite link token or invite code
        Group? group;
        InviteLink? usedInviteLink = null;

        if (!string.IsNullOrWhiteSpace(request.InviteLinkToken))
        {
            // Use HybridCache to look up group ID from invite link token
            var cachedGroupId = await cache.GetOrCreateAsync(
                InviteLinkCacheKey(request.InviteLinkToken),
                async cancel =>
                {
                    var link = await db.InviteLinks
                        .AsNoTracking()
                        .Where(il => il.Token == request.InviteLinkToken)
                        .Select(il => new { il.GroupId })
                        .FirstOrDefaultAsync(cancel);
                    return link?.GroupId ?? 0;
                },
                new HybridCacheEntryOptions
                {
                    Expiration = TimeSpan.FromMinutes(10),
                    LocalCacheExpiration = TimeSpan.FromMinutes(5),
                });

            if (cachedGroupId == 0)
                return Results.BadRequest(new ErrorResponse(localizer["InvalidInviteLink"]));

            // Still need the full entity for use-count increment (must be tracked)
            usedInviteLink = await db.InviteLinks
                .Include(il => il.Group)
                .FirstOrDefaultAsync(il => il.Token == request.InviteLinkToken);

            if (usedInviteLink == null)
            {
                await cache.RemoveAsync(InviteLinkCacheKey(request.InviteLinkToken));
                return Results.BadRequest(new ErrorResponse(localizer["InvalidInviteLink"]));
            }

            if (usedInviteLink.ExpiresAt.HasValue && usedInviteLink.ExpiresAt.Value < DateTime.UtcNow)
                return Results.BadRequest(new ErrorResponse(localizer["InviteLinkExpired"]));

            if (usedInviteLink.MaxUses.HasValue && usedInviteLink.UseCount >= usedInviteLink.MaxUses.Value)
                return Results.BadRequest(new ErrorResponse(localizer["InviteLinkMaxUsesReached"]));

            group = usedInviteLink.Group;
        }
        else
        {
            group = await db.Groups
                .FirstOrDefaultAsync(g =>
                    g.InviteCode == request.InviteCode.Trim().ToUpperInvariant());
        }

        if (group == null)
            return Results.NotFound(new ErrorResponse(localizer["InvalidInviteCode"]));

        // Cannot join personal groups
        if (group.GroupType == GroupType.Personal)
            return Results.BadRequest(new ErrorResponse(localizer["CannotJoinPersonalGroup"]));

        // 2. Check authentication - invite link token bypasses OTP
        if (usedInviteLink == null && group.IsPrivate)
        {
            // Private groups require OTP when not using invite link
            if (string.IsNullOrWhiteSpace(request.Otp))
            {
                return Results.BadRequest(new ErrorResponse(localizer["OtpRequired"]));
            }

            var otpValid = await otpService.ValidateOtpAsync(group.Id, request.Otp);
            if (!otpValid)
                return Results.BadRequest(new ErrorResponse(localizer["InvalidOrExpiredOtp"]));
        }

        // 3. Check membership
        if (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == userId))
            return Results.BadRequest(new ErrorResponse(localizer["AlreadyMember"]));

        // 4. Add member with default role
        db.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = userId,
            Role = group.DefaultRole
        });

        // Increment invite link use count if used
        if (usedInviteLink != null)
        {
            usedInviteLink.UseCount++;
        }

        await db.SaveChangesAsync();

        var updatedGroup = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
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
            updatedGroup.GroupType,
            updatedGroup.DefaultRole,
            updatedGroup.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
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

    private static async Task<IResult> DeleteUser(
        int id, int userId, ClaimsPrincipal user, AppDbContext db, ILocalizationService localizer)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);

        // Check ManageMembers permission (includes custom permissions)
        if (currentMember == null || !PermissionService.GetEffectivePermissions(currentMember).HasFlag(Permission.ManageMembers))
        {
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsRemove"]));
        }

        // Cannot delete the owner
        var memberToDelete = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (memberToDelete == null)
            return Results.NotFound();

        if (memberToDelete.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new ErrorResponse(localizer["CannotRemoveOwner"]));
        }

        // Non-Admin/Owner with ManageMembers can't kick Admin+
        if (currentMember.Role != GroupRole.Owner && currentMember.Role != GroupRole.Admin
            && memberToDelete.Role >= GroupRole.Admin)
        {
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsRemove"]));
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

    private static async Task<IResult> TransferGroup(
        int id, TransferGroupRequest request, ClaimsPrincipal user, AppDbContext db, ILocalizationService localizer)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group is null)
            return Results.NotFound();

        // Validation: caller must be current owner
        if (group.CreatedByUserId != currentUserId)
            return Results.BadRequest(new ErrorResponse(localizer["OnlyOwnerTransfer"]));

        // Validation: new owner must be a member of the group
        var newOwnerMember = group.Members.FirstOrDefault(m => m.UserId == request.NewOwnerId);
        if (newOwnerMember == null)
            return Results.BadRequest(new ErrorResponse(localizer["MustBeMember"]));

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
            group.GroupType,
            group.DefaultRole,
            group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
            )).ToList(),
            group.CreatedAt
        ));
    }

    private static async Task<IResult> UpdateMemberRole(
        int id,
        int userId,
        UpdateMemberRoleRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        ILocalizationService localizer)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);

        // Check ManageMembers permission (includes custom permissions)
        if (currentMember == null || !PermissionService.GetEffectivePermissions(currentMember).HasFlag(Permission.ManageMembers))
        {
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsChangeRole"]));
        }

        var memberToUpdate = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (memberToUpdate == null)
            return Results.NotFound(new ErrorResponse(localizer["UserNotGroupMember"]));

        // Cannot change owner's role
        if (memberToUpdate.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new ErrorResponse(localizer["CannotChangeOwnerRole"]));
        }

        // Non-Owner cannot modify Admin+ roles
        if (currentMember.Role != GroupRole.Owner && memberToUpdate.Role >= GroupRole.Admin)
        {
            return Results.BadRequest(new ErrorResponse(localizer["AdminsCannotModify"]));
        }

        // Cannot set role to Owner
        if (request.Role == GroupRole.Owner)
        {
            return Results.BadRequest(new ErrorResponse(localizer["UseTransferOwnership"]));
        }

        memberToUpdate.Role = request.Role;
        await db.SaveChangesAsync();

        return Results.Ok(new GroupDto(
            group.Id,
            group.Name,
            group.InviteCode,
            group.CreatedByUserId,
            group.IsPrivate,
            group.GroupType,
            group.DefaultRole,
            group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
            )).ToList(),
            group.CreatedAt
        ));
    }

    private static async Task<IResult> GenerateOtp(
        int id,
        ClaimsPrincipal user,
        AppDbContext db,
        OtpService otpService,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);

        // Check ManageMembers permission
        if (member == null || !PermissionService.GetEffectivePermissions(member).HasFlag(Permission.ManageMembers))
        {
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsOtp"]));
        }

        // Group must be private to generate OTP
        if (!group.IsPrivate)
        {
            return Results.BadRequest(new ErrorResponse(localizer["OtpOnlyForPrivate"]));
        }

        var (code, expiresAt) = await otpService.GenerateOtpAsync(group.Id);

        return Results.Ok(new GenerateOtpResponse(code, expiresAt));
    }

    private static async Task<IResult> UpdateGroupSettings(
        int id,
        UpdateGroupSettingsRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        HybridCache cache,
        OtpService otpService,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);

        // Check ManageGroup permission
        if (member == null || !PermissionService.GetEffectivePermissions(member).HasFlag(Permission.ManageGroup))
        {
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));
        }

        // Cannot modify personal groups
        if (group.GroupType == GroupType.Personal)
            return Results.BadRequest(new ErrorResponse("Cannot modify personal groups"));

        // Update name if provided
        if (request.Name != null)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 50)
                return Results.BadRequest(new ErrorResponse("Group name must be between 1 and 50 characters"));
            group.Name = request.Name.Trim();
        }

        // Update privacy if provided
        if (request.IsPrivate.HasValue && request.IsPrivate.Value != group.IsPrivate)
        {
            group.IsPrivate = request.IsPrivate.Value;
            group.GroupType = request.IsPrivate.Value ? GroupType.Private : GroupType.Public;

            // When switching to public, update default role to Viewer
            if (!request.IsPrivate.Value)
            {
                group.DefaultRole = GroupRole.Viewer;
            }

            // Delete all invite links and evict their cache entries
            var inviteLinks = await db.InviteLinks
                .Where(il => il.GroupId == group.Id)
                .ToListAsync();
            foreach (var link in inviteLinks)
            {
                await cache.RemoveAsync(InviteLinkCacheKey(link.Token));
            }
            db.InviteLinks.RemoveRange(inviteLinks);

            // Invalidate all OTPs
            await otpService.InvalidateAllOtpsAsync(group.Id);

            // Regenerate invite code
            group.InviteCode = GenerateInviteCode();
        }

        // Update default role if provided
        if (request.DefaultRole.HasValue)
        {
            var newRole = request.DefaultRole.Value;
            // Cannot set default role to Owner
            if (newRole == GroupRole.Owner)
                return Results.BadRequest(new ErrorResponse("Cannot set default role to Owner"));

            // Public groups can only have Viewer as default role
            if (!group.IsPrivate && newRole != GroupRole.Viewer)
                return Results.BadRequest(new ErrorResponse("Public groups can only have Viewer as the default role"));

            // Private groups allow Viewer, Member, or Admin
            group.DefaultRole = newRole;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new GroupDto(
            group.Id,
            group.Name,
            group.InviteCode,
            group.CreatedByUserId,
            group.IsPrivate,
            group.GroupType,
            group.DefaultRole,
            group.Members.Select(m => new GroupMemberDto(
                m.UserId,
                m.User.DisplayName ?? m.User.Username,
                m.Role,
                m.JoinedAt,
                m.CustomPermission != null
            )).ToList(),
            group.CreatedAt
        ));
    }

    private static async Task<IResult> GetMyPermissions(
        int id,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        var perms = await PermissionService.GetUserPermissions(db, userId, id);
        if (perms == null)
            return Results.NotFound();

        return Results.Ok(new PermissionsResponse(
            (int)perms.Value,
            perms.Value.HasFlag(Permission.ViewEntries),
            perms.Value.HasFlag(Permission.CreateEntries),
            perms.Value.HasFlag(Permission.EditOwnEntries),
            perms.Value.HasFlag(Permission.EditAllEntries),
            perms.Value.HasFlag(Permission.DeleteOwnEntries),
            perms.Value.HasFlag(Permission.DeleteAllEntries),
            perms.Value.HasFlag(Permission.RateSelf),
            perms.Value.HasFlag(Permission.RateOthers),
            perms.Value.HasFlag(Permission.ManageMembers),
            perms.Value.HasFlag(Permission.ManageGroup)
        ));
    }

    private static MemberPermissionDetailResponse BuildPermissionDetail(
        GroupMember member)
    {
        var roleDefaults = PermissionService.GetRolePermissions(member.Role);
        var granted = member.CustomPermission?.GrantedPermissions ?? Permission.None;
        var revoked = member.CustomPermission?.RevokedPermissions ?? Permission.None;
        var effective = PermissionService.GetEffectivePermissions(member);

        return new MemberPermissionDetailResponse(
            (int)roleDefaults,
            (int)granted,
            (int)revoked,
            (int)effective,
            effective.HasFlag(Permission.ViewEntries),
            effective.HasFlag(Permission.CreateEntries),
            effective.HasFlag(Permission.EditOwnEntries),
            effective.HasFlag(Permission.EditAllEntries),
            effective.HasFlag(Permission.DeleteOwnEntries),
            effective.HasFlag(Permission.DeleteAllEntries),
            effective.HasFlag(Permission.RateSelf),
            effective.HasFlag(Permission.RateOthers),
            effective.HasFlag(Permission.ManageMembers),
            effective.HasFlag(Permission.ManageGroup),
            member.CustomPermission != null
        );
    }

    private static async Task<IResult> GetMemberPermissions(
        int id,
        int userId,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (currentMember == null)
            return Results.NotFound();

        // Any member can view their own; Owner/Admin can view anyone's
        if (currentUserId != userId
            && currentMember.Role != GroupRole.Owner
            && currentMember.Role != GroupRole.Admin)
        {
            return Results.BadRequest(new ErrorResponse("Insufficient permissions"));
        }

        var targetMember = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (targetMember == null)
            return Results.NotFound();

        return Results.Ok(BuildPermissionDetail(targetMember));
    }

    private static async Task<IResult> UpdateMemberPermissions(
        int id,
        int userId,
        UpdateMemberPermissionsRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var currentUserId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var currentMember = group.Members.FirstOrDefault(m => m.UserId == currentUserId);
        if (currentMember == null)
            return Results.NotFound();

        var targetMember = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (targetMember == null)
            return Results.NotFound();

        // Cannot modify Owner's permissions
        if (targetMember.Role == GroupRole.Owner)
            return Results.BadRequest(new ErrorResponse("Cannot modify owner's permissions"));

        // Auth: Owner can edit anyone (except Owner, checked above); Admin can edit Viewer/Member
        if (currentMember.Role == GroupRole.Owner)
        {
            // OK
        }
        else if (currentMember.Role == GroupRole.Admin)
        {
            if (targetMember.Role >= GroupRole.Admin)
                return Results.BadRequest(new ErrorResponse("Admins cannot modify admin or higher permissions"));
        }
        else
        {
            return Results.BadRequest(new ErrorResponse("Insufficient permissions"));
        }

        var granted = (Permission)request.GrantedPermissions;
        var revoked = (Permission)request.RevokedPermissions;

        // Cannot grant ManageGroup to non-owners
        if (granted.HasFlag(Permission.ManageGroup))
            return Results.BadRequest(new ErrorResponse("Cannot grant ManageGroup to non-owners"));

        // Granted & revoked must not overlap
        if ((granted & revoked) != Permission.None)
            return Results.BadRequest(new ErrorResponse("Granted and revoked permissions must not overlap"));

        // If both are None → reset to defaults (delete record)
        if (granted == Permission.None && revoked == Permission.None)
        {
            if (targetMember.CustomPermission != null)
            {
                db.Remove(targetMember.CustomPermission);
                await db.SaveChangesAsync();
                // Reload to get clean state
                targetMember.CustomPermission = null;
            }
        }
        else if (targetMember.CustomPermission != null)
        {
            targetMember.CustomPermission.GrantedPermissions = granted;
            targetMember.CustomPermission.RevokedPermissions = revoked;
            await db.SaveChangesAsync();
        }
        else
        {
            var newPermission = new MemberPermission
            {
                GroupMemberId = targetMember.Id,
                GrantedPermissions = granted,
                RevokedPermissions = revoked,
            };
            db.Set<MemberPermission>().Add(newPermission);
            await db.SaveChangesAsync();
            targetMember.CustomPermission = newPermission;
        }

        return Results.Ok(BuildPermissionDetail(targetMember));
    }

    private static async Task<IResult> CreateInviteLink(
        int id,
        CreateInviteLinkRequest request,
        ClaimsPrincipal user,
        AppDbContext db,
        HybridCache cache,
        HttpContext httpContext,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null)
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        var effectivePerms = PermissionService.GetEffectivePermissions(member);
        if (!effectivePerms.HasFlag(Permission.ManageMembers) && !effectivePerms.HasFlag(Permission.ManageGroup))
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        var token = Guid.NewGuid().ToString("N");

        // Public groups get permanent links (no expiry, no max uses)
        var expiresAt = !group.IsPrivate
            ? (DateTime?)null
            : request.ExpiresInMinutes.HasValue
                ? DateTime.UtcNow.AddMinutes(request.ExpiresInMinutes.Value)
                : null;
        var maxUses = !group.IsPrivate ? (int?)null
            : request.MaxUses is > 0 and <= 999999 ? request.MaxUses : null;

        var inviteLink = new InviteLink
        {
            GroupId = group.Id,
            Token = token,
            ExpiresAt = expiresAt,
            MaxUses = maxUses,
            CreatedByUserId = userId,
        };

        db.InviteLinks.Add(inviteLink);
        await db.SaveChangesAsync();

        // Pre-populate the cache with the new link's group ID
        await cache.SetAsync(
            InviteLinkCacheKey(token),
            group.Id,
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(10),
                LocalCacheExpiration = TimeSpan.FromMinutes(5),
            });

        var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
        var url = $"{baseUrl}/api/groups/join?token={token}";

        return Results.Created($"/api/groups/{id}/invite-links/{inviteLink.Id}", new InviteLinkDto(
            inviteLink.Id,
            inviteLink.Token,
            url,
            inviteLink.ExpiresAt,
            inviteLink.MaxUses,
            inviteLink.UseCount,
            inviteLink.CreatedAt
        ));
    }

    private static async Task<IResult> GetInviteLinks(
        int id,
        ClaimsPrincipal user,
        AppDbContext db,
        HttpContext httpContext,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null)
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        // Public groups: all members can view links; Private groups: need ManageMembers or ManageGroup
        if (group.IsPrivate)
        {
            var effectivePerms = PermissionService.GetEffectivePermissions(member);
            if (!effectivePerms.HasFlag(Permission.ManageMembers) && !effectivePerms.HasFlag(Permission.ManageGroup))
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));
        }

        var now = DateTime.UtcNow;
        var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";

        var links = await db.InviteLinks
            .Where(il => il.GroupId == id)
            .Where(il => !il.ExpiresAt.HasValue || il.ExpiresAt.Value > now)
            .Where(il => !il.MaxUses.HasValue || il.UseCount < il.MaxUses.Value)
            .OrderByDescending(il => il.CreatedAt)
            .Select(il => new InviteLinkDto(
                il.Id,
                il.Token,
                $"{baseUrl}/api/groups/join?token={il.Token}",
                il.ExpiresAt,
                il.MaxUses,
                il.UseCount,
                il.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(links);
    }

    private static async Task<IResult> DeleteInviteLink(
        int id,
        int linkId,
        ClaimsPrincipal user,
        AppDbContext db,
        HybridCache cache,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        var group = await db.Groups
            .Include(g => g.Members)
                .ThenInclude(m => m.CustomPermission)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return Results.NotFound();

        var member = group.Members.FirstOrDefault(m => m.UserId == userId);
        if (member == null)
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        var effectivePerms = PermissionService.GetEffectivePermissions(member);
        if (!effectivePerms.HasFlag(Permission.ManageMembers) && !effectivePerms.HasFlag(Permission.ManageGroup))
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        var link = await db.InviteLinks
            .FirstOrDefaultAsync(il => il.Id == linkId && il.GroupId == id);

        if (link == null)
            return Results.NotFound();

        // Evict cache before removing
        await cache.RemoveAsync(InviteLinkCacheKey(link.Token));

        db.InviteLinks.Remove(link);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
}
