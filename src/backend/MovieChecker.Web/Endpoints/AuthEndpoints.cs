using System.Security.Cryptography;
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
    private const int LocalTokenExpirySeconds = 3600;

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces<ValidationErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status502BadGateway)
            .WithSummary("Register a new user via Authentik")
            .WithDescription("Creates a new user in Authentik, authenticates via OAuth2, and returns tokens");

        group.MapPost("/login", Login)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Login with credentials via Authentik")
            .WithDescription("Authenticates a user via Authentik and returns tokens");

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

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    }

    private static async Task StoreRefreshToken(IDatabase redisDb, int userId, string refreshToken)
    {
        // Store forward: user_id → token
        await redisDb.StringSetAsync($"refresh_tokens:{userId}", refreshToken, RefreshTokenExpiry);
        // Store reverse: token → user_id (for lookup during refresh)
        await redisDb.StringSetAsync($"refresh_tokens_lookup:{refreshToken}", userId.ToString(), RefreshTokenExpiry);
    }

    private static async Task ClearRefreshToken(IDatabase redisDb, int userId)
    {
        var existingToken = await redisDb.StringGetAsync($"refresh_tokens:{userId}");
        if (existingToken.HasValue)
        {
            await redisDb.KeyDeleteAsync($"refresh_tokens_lookup:{existingToken}");
        }
        await redisDb.KeyDeleteAsync($"refresh_tokens:{userId}");
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        AuthentikOAuthService authentikService,
        TokenService tokenService,
        ValidationService validationService,
        ILocalizationService localizer,
        IConnectionMultiplexer redis)
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

        // Check if username exists in Authentik
        var userExists = await authentikService.UserExistsAsync(request.Username);
        if (userExists == null)
        {
            return Results.Json(new ErrorResponse("Authentication service unavailable - cannot verify username"),
                statusCode: 502);
        }
        if (userExists.Value)
        {
            return Results.BadRequest(new ErrorResponse(localizer["UsernameAlreadyExists"]));
        }

        // Create user in Authentik
        var displayName = string.IsNullOrEmpty(request.DisplayName) ? request.Username : request.DisplayName;
        var authentikUserId = await authentikService.CreateUserAsync(request.Username, displayName);

        if (authentikUserId == null)
        {
            return Results.Json(new ErrorResponse("Failed to create user — authentication service unavailable"),
                statusCode: 502);
        }

        // Set password in Authentik
        var passwordSet = await authentikService.SetUserPasswordAsync(authentikUserId.Value, request.Password);

        if (!passwordSet)
        {
            return Results.Json(new ErrorResponse("Failed to set password — authentication service unavailable"),
                statusCode: 502);
        }

        // Authenticate the newly created user to verify everything works
        var authenticated = await authentikService.AuthenticateViaFlowAsync(request.Username, request.Password);
        if (!authenticated)
        {
            // Flow executor failed, try ROPC as fallback (don't block registration if both fail)
            await authentikService.AuthenticateViaRopcAsync(request.Username, request.Password);
        }

        // Provision local user and generate tokens
        var user = await tokenService.ProvisionUserFromUsernameAsync(request.Username, displayName);
        var localToken = tokenService.GenerateLocalToken(user);
        var refreshToken = GenerateRefreshToken();

        var redisDb = redis.GetDatabase();
        await StoreRefreshToken(redisDb, user.Id, refreshToken);

        return Results.Ok(new OAuthTokenResponse(
            localToken,
            refreshToken,
            LocalTokenExpirySeconds,
            "Bearer"
        ));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        AuthentikOAuthService authentikService,
        TokenService tokenService,
        IConnectionMultiplexer redis)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest(new ErrorResponse("Username and password are required"));
        }

        // Primary: authenticate via Authentik flow executor (headless)
        var authenticated = await authentikService.AuthenticateViaFlowAsync(request.Username, request.Password);

        if (!authenticated)
        {
            // Fallback: try ROPC token endpoint
            var ropcResult = await authentikService.AuthenticateViaRopcAsync(request.Username, request.Password);
            if (ropcResult != null)
            {
                // ROPC worked — use Authentik JWT to provision user
                var claims = tokenService.ParseAuthentikToken(ropcResult.AccessToken);
                if (claims != null)
                {
                    var ropcUser = await tokenService.ProvisionUserAsync(claims);
                    var ropcLocalToken = tokenService.GenerateLocalToken(ropcUser);
                    var ropcRefreshToken = GenerateRefreshToken();

                    var redisDb2 = redis.GetDatabase();
                    await StoreRefreshToken(redisDb2, ropcUser.Id, ropcRefreshToken);

                    return Results.Ok(new OAuthTokenResponse(
                        ropcLocalToken,
                        ropcRefreshToken,
                        ropcResult.ExpiresIn > 0 ? ropcResult.ExpiresIn : LocalTokenExpirySeconds,
                        "Bearer"
                    ));
                }
            }

            return Results.Json(new ErrorResponse("Invalid credentials"), statusCode: 401);
        }

        // Flow executor succeeded — provision user from username
        var user = await tokenService.ProvisionUserFromUsernameAsync(request.Username);
        var localToken = tokenService.GenerateLocalToken(user);
        var refreshToken = GenerateRefreshToken();

        var redisDb = redis.GetDatabase();
        await StoreRefreshToken(redisDb, user.Id, refreshToken);

        return Results.Ok(new OAuthTokenResponse(
            localToken,
            refreshToken,
            LocalTokenExpirySeconds,
            "Bearer"
        ));
    }

    private static async Task<IResult> Refresh(
        RefreshTokenRequest request,
        TokenService tokenService,
        AuthentikOAuthService authentikService,
        AppDbContext db,
        IConnectionMultiplexer redis)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.Json(new ErrorResponse("Refresh token is required"), statusCode: 401);
        }

        var redisDb = redis.GetDatabase();

        // Look up user by refresh token
        var userIdStr = await redisDb.StringGetAsync($"refresh_tokens_lookup:{request.RefreshToken}");
        if (!userIdStr.HasValue || !int.TryParse(userIdStr.ToString(), out var userId))
        {
            return Results.Json(new ErrorResponse("Invalid or expired refresh token"), statusCode: 401);
        }

        // Verify the token matches what's stored for this user
        var storedToken = await redisDb.StringGetAsync($"refresh_tokens:{userId}");
        if (!storedToken.HasValue || storedToken.ToString() != request.RefreshToken)
        {
            return Results.Json(new ErrorResponse("Invalid or expired refresh token"), statusCode: 401);
        }

        // Get user from DB
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return Results.Json(new ErrorResponse("User not found"), statusCode: 401);
        }

        // Check if user is still active in Authentik before issuing new tokens
        var isActive = await authentikService.IsUserActiveAsync(user.Username);
        if (isActive == false)
        {
            // User was deactivated — clear their refresh token and deny
            await ClearRefreshToken(redisDb, userId);
            return Results.Json(new ErrorResponse("User account is deactivated"), statusCode: 401);
        }

        // Generate new tokens and rotate refresh token
        var localToken = tokenService.GenerateLocalToken(user);
        var newRefreshToken = GenerateRefreshToken();

        // Clear old and store new
        await ClearRefreshToken(redisDb, userId);
        await StoreRefreshToken(redisDb, userId, newRefreshToken);

        return Results.Ok(new OAuthTokenResponse(
            localToken,
            newRefreshToken,
            LocalTokenExpirySeconds,
            "Bearer"
        ));
    }

    private static async Task<IResult> Logout(
        HttpContext context,
        IConnectionMultiplexer redis)
    {
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (!string.IsNullOrEmpty(userId) && int.TryParse(userId, out var uid))
        {
            var redisDb = redis.GetDatabase();
            await ClearRefreshToken(redisDb, uid);
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
