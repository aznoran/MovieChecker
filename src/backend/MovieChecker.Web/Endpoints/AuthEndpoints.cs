using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;
using StackExchange.Redis;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    private static readonly TimeSpan RefreshTokenExpiry = TimeSpan.FromDays(30);

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register)
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .Produces<ValidationErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Register a new user")
            .WithDescription("Creates a new user account and returns a JWT token");

        group.MapPost("/login", Login)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Login with credentials via Authentik")
            .WithDescription("Authenticates a user via Authentik OAuth2 Resource Owner Password flow and returns tokens");

        group.MapPost("/refresh", Refresh)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Refresh access token")
            .WithDescription("Refreshes an access token using a refresh token");

        group.MapPost("/logout", Logout)
            .RequireAuthorization()
            .Produces<SuccessResponse>(StatusCodes.Status200OK)
            .WithSummary("Logout")
            .WithDescription("Revokes the refresh token and logs the user out");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        AppDbContext db,
        JwtService jwtService,
        ValidationService validationService,
        ILocalizationService localizer)
    {
        // Validate input
        var validationResult = validationService.ValidateRegistration(
            request.Username,
            request.Password,
            request.DisplayName
        );

        if (!validationResult.IsValid)
        {
            return Results.BadRequest(new ValidationErrorResponse(
                localizer["ValidationFailed"], 
                validationResult.Errors
            ));
        }

        if (await db.Users.AnyAsync(u => u.Username == request.Username))
        {
            return Results.BadRequest(new ErrorResponse(localizer["UsernameAlreadyExists"]));
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = string.IsNullOrEmpty(request.DisplayName) ? request.Username : request.DisplayName
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

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
        db.Groups.Add(personalGroup);
        await db.SaveChangesAsync();

        db.GroupMembers.Add(new GroupMember
        {
            GroupId = personalGroup.Id,
            UserId = user.Id,
            Role = GroupRole.Owner
        });
        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(user);
        return Results.Ok(new AuthResponse(
            token,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        AppDbContext db,
        JwtService jwtService,
        AuthentikOAuthService authentikService,
        TokenService tokenService,
        IConnectionMultiplexer redis)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest(new ErrorResponse("Username and password are required"));
        }

        // Try Authentik OAuth2 Resource Owner Password flow first
        var authentikResult = await authentikService.AuthenticateAsync(request.Username, request.Password);

        if (authentikResult != null)
        {
            // Parse claims from Authentik token
            var claims = tokenService.ParseAuthentikToken(authentikResult.AccessToken);
            if (claims != null)
            {
                // Auto-provision user in local DB
                var user = await tokenService.ProvisionUserAsync(claims);
                var localToken = tokenService.GenerateLocalToken(user);

                // Store refresh token in Redis
                if (!string.IsNullOrEmpty(authentikResult.RefreshToken))
                {
                    var redisDb = redis.GetDatabase();
                    var key = $"refresh_tokens:{user.Id}";
                    await redisDb.StringSetAsync(key, authentikResult.RefreshToken,
                        RefreshTokenExpiry);
                }

                return Results.Ok(new OAuthTokenResponse(
                    localToken,
                    authentikResult.RefreshToken,
                    authentikResult.ExpiresIn > 0 ? authentikResult.ExpiresIn : 3600,
                    "Bearer"
                ));
            }
        }

        // Fallback: local authentication (existing behavior)
        var localUser = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (localUser == null || string.IsNullOrEmpty(localUser.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(request.Password, localUser.PasswordHash))
        {
            return Results.Json(new ErrorResponse("Invalid credentials"), statusCode: 401);
        }

        var fallbackToken = jwtService.GenerateToken(localUser);
        return Results.Ok(new OAuthTokenResponse(
            fallbackToken,
            null,
            3600,
            "Bearer"
        ));
    }

    private static async Task<IResult> Refresh(
        RefreshTokenRequest request,
        AuthentikOAuthService authentikService,
        TokenService tokenService,
        AppDbContext db,
        IConnectionMultiplexer redis)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.Json(new ErrorResponse("Refresh token is required"), statusCode: 401);
        }

        // Refresh via Authentik
        var result = await authentikService.RefreshTokenAsync(request.RefreshToken);

        if (result == null)
        {
            return Results.Json(new ErrorResponse("Invalid or expired refresh token"), statusCode: 401);
        }

        // Parse claims and re-provision if needed
        var claims = tokenService.ParseAuthentikToken(result.AccessToken);
        if (claims == null)
        {
            return Results.Json(new ErrorResponse("Failed to parse refreshed token"), statusCode: 401);
        }

        var user = await tokenService.ProvisionUserAsync(claims);
        var localToken = tokenService.GenerateLocalToken(user);

        // Update refresh token in Redis
        if (!string.IsNullOrEmpty(result.RefreshToken))
        {
            var redisDb = redis.GetDatabase();
            var key = $"refresh_tokens:{user.Id}";
            await redisDb.StringSetAsync(key, result.RefreshToken,
                RefreshTokenExpiry);
        }

        return Results.Ok(new OAuthTokenResponse(
            localToken,
            result.RefreshToken,
            result.ExpiresIn > 0 ? result.ExpiresIn : 3600,
            "Bearer"
        ));
    }

    private static async Task<IResult> Logout(
        HttpContext context,
        AuthentikOAuthService authentikService,
        IConnectionMultiplexer redis)
    {
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            var redisDb = redis.GetDatabase();
            var key = $"refresh_tokens:{userId}";
            var refreshToken = await redisDb.StringGetAsync(key);

            // Revoke at Authentik if we have a stored refresh token
            if (refreshToken.HasValue)
            {
                await authentikService.RevokeTokenAsync(refreshToken.ToString());
                await redisDb.KeyDeleteAsync(key);
            }
        }

        return Results.Ok(new SuccessResponse("Logged out successfully"));
    }

    private static IResult SetLanguage(HttpContext context, SetLanguageRequest request)
    {
        var culture = request.Language switch
        {
            "ru" => "ru",
            _ => "en"
        };

        context.Response.Cookies.Append(
            Microsoft.AspNetCore.Localization.CookieRequestCultureProvider.DefaultCookieName,
            Microsoft.AspNetCore.Localization.CookieRequestCultureProvider.MakeCookieValue(
                new Microsoft.AspNetCore.Localization.RequestCulture(culture)),
            new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddYears(1),
                IsEssential = true,
                HttpOnly = false,
                SameSite = SameSiteMode.Lax
            }
        );

        return Results.Ok(new LanguageResponse(culture));
    }
}

public record SetLanguageRequest(string Language);
