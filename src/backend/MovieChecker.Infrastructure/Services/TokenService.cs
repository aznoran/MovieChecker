using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Infrastructure.Services;

public class TokenService
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwtService;
    private readonly ILogger<TokenService> _logger;

    public TokenService(AppDbContext db, JwtService jwtService, ILogger<TokenService> logger)
    {
        _db = db;
        _jwtService = jwtService;
        _logger = logger;
    }

    /// <summary>
    /// Parses claims from an Authentik access token (JWT) without signature validation.
    /// The token has already been validated by Authentik when it was issued.
    /// </summary>
    public AuthentikUserClaims? ParseAuthentikToken(string accessToken)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(accessToken);

            var sub = jwt.Claims.FirstOrDefault(c => c.Type == "sub")?.Value;
            var preferredUsername = jwt.Claims.FirstOrDefault(c => c.Type == "preferred_username")?.Value;
            var name = jwt.Claims.FirstOrDefault(c => c.Type == "name")?.Value;
            var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;

            if (string.IsNullOrEmpty(sub))
            {
                _logger.LogWarning("Authentik token missing 'sub' claim");
                return null;
            }

            return new AuthentikUserClaims(
                Sub: sub,
                PreferredUsername: preferredUsername ?? email ?? sub,
                Name: name ?? preferredUsername ?? sub,
                Email: email
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Authentik access token");
            return null;
        }
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
    /// Generates a local JWT for the provisioned user (used as the access token returned to frontend).
    /// </summary>
    public string GenerateLocalToken(User user)
    {
        return _jwtService.GenerateToken(user);
    }
}

public record AuthentikUserClaims(
    string Sub,
    string PreferredUsername,
    string Name,
    string? Email
);
