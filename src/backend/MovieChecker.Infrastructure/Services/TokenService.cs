using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Infrastructure.Services;

public class TokenService
{
    private readonly AppDbContext _db;
    private readonly ILogger<TokenService> _logger;

    public TokenService(AppDbContext db, ILogger<TokenService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Provisions a local user from Authentik claims. Creates the user and a personal group
    /// if they don't exist yet. Returns the local user entity.
    /// </summary>
    public async Task<User> ProvisionUserAsync(AuthentikUserClaims claims)
    {
        // Try to find existing user by username (preferred_username from Authentik)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == claims.PreferredUsername);

        if (user != null)
        {
            // Update display name if changed in Authentik
            if (user.DisplayName != claims.Name)
            {
                user.DisplayName = claims.Name;
                await _db.SaveChangesAsync();
            }
            return user;
        }

        // Create new user
        user = new User
        {
            Username = claims.PreferredUsername,
            PasswordHash = string.Empty, // No local password for Authentik users
            DisplayName = claims.Name
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Create personal group for the new user
        var personalGroup = new Group
        {
            Name = "Personal",
            InviteCode = null,
            CreatedByUserId = user.Id,
            IsPrivate = false,
            GroupType = GroupType.Personal,
            DefaultRole = GroupRole.Owner
        };
        _db.Groups.Add(personalGroup);
        await _db.SaveChangesAsync();

        _db.GroupMembers.Add(new GroupMember
        {
            GroupId = personalGroup.Id,
            UserId = user.Id,
            Role = GroupRole.Owner
        });
        await _db.SaveChangesAsync();

        _logger.LogInformation("Provisioned new user {Username} (ID: {UserId}) from Authentik",
            user.Username, user.Id);

        return user;
    }

    /// <summary>
    /// Provisions a local user from a username (used when authenticating via flow executor
    /// where we don't have Authentik JWT claims). Creates the user and a personal group
    /// if they don't exist yet. Returns the local user entity.
    /// </summary>
    public async Task<User> ProvisionUserFromUsernameAsync(string username, string? displayName = null)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user != null)
        {
            if (displayName != null && user.DisplayName != displayName)
            {
                user.DisplayName = displayName;
                await _db.SaveChangesAsync();
            }
            return user;
        }

        user = new User
        {
            Username = username,
            PasswordHash = string.Empty,
            DisplayName = displayName ?? username
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var personalGroup = new Group
        {
            Name = "Personal",
            InviteCode = null,
            CreatedByUserId = user.Id,
            IsPrivate = false,
            GroupType = GroupType.Personal,
            DefaultRole = GroupRole.Owner
        };
        _db.Groups.Add(personalGroup);
        await _db.SaveChangesAsync();

        _db.GroupMembers.Add(new GroupMember
        {
            GroupId = personalGroup.Id,
            UserId = user.Id,
            Role = GroupRole.Owner
        });
        await _db.SaveChangesAsync();

        _logger.LogInformation("Provisioned user {Username} (ID: {UserId}) from flow executor",
            user.Username, user.Id);

        return user;
    }
}

public record AuthentikUserClaims(
    string Sub,
    string PreferredUsername,
    string Name,
    string? Email
);
