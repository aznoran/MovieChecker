using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces<ValidationErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status502BadGateway)
            .WithSummary("Register a new user via Authentik")
            .WithDescription("Creates a new user in Authentik, authenticates via OAuth2, and returns Authentik tokens");

        group.MapPost("/login", Login)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Login with credentials via Authentik")
            .WithDescription("Authenticates via Authentik and returns Authentik tokens");

        group.MapPost("/refresh", Refresh)
            .Produces<OAuthTokenResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Refresh access token via Authentik")
            .WithDescription("Refreshes tokens using Authentik's refresh_token grant");

        group.MapPost("/logout", Logout)
            .RequireAuthorization()
            .Produces<SuccessResponse>(StatusCodes.Status200OK)
            .WithSummary("Logout")
            .WithDescription("Revokes the refresh token at Authentik");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        AuthentikOAuthService authentikService,
        TokenService tokenService,
        ValidationService validationService,
        ILocalizationService localizer)
    {
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
            return Results.Json(new ErrorResponse("Authentication service unavailable — cannot verify username"),
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

        var passwordSet = await authentikService.SetUserPasswordAsync(authentikUserId.Value, request.Password);
        if (!passwordSet)
        {
            return Results.Json(new ErrorResponse("Failed to set password — authentication service unavailable"),
                statusCode: 502);
        }

        // Authenticate the newly created user to get Authentik tokens
        var tokens = await authentikService.AuthenticateAsync(request.Username, request.Password);
        if (tokens == null)
        {
            return Results.Json(new ErrorResponse("User created but authentication failed — please try logging in"),
                statusCode: 502);
        }

        // Provision local user
        var user = await tokenService.ProvisionUserFromUsernameAsync(request.Username, displayName);

        return Results.Ok(new OAuthTokenResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresIn,
            tokens.TokenType,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        AuthentikOAuthService authentikService,
        TokenService tokenService)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest(new ErrorResponse("Username and password are required"));
        }

        // Authenticate via Authentik flow executor + authorization code exchange
        var tokens = await authentikService.AuthenticateAsync(request.Username, request.Password);
        if (tokens == null)
        {
            return Results.Json(new ErrorResponse("Invalid credentials"), statusCode: 401);
        }

        // Provision local user
        var user = await tokenService.ProvisionUserFromUsernameAsync(request.Username);

        return Results.Ok(new OAuthTokenResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresIn,
            tokens.TokenType,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static async Task<IResult> Refresh(
        RefreshTokenRequest request,
        TokenService tokenService,
        AuthentikOAuthService authentikService,
        AppDbContext db)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.Json(new ErrorResponse("Refresh token is required"), statusCode: 401);
        }

        // Exchange refresh token at Authentik
        var tokens = await authentikService.RefreshTokenAsync(request.RefreshToken);
        if (tokens == null)
        {
            return Results.Json(new ErrorResponse("Invalid or expired refresh token"), statusCode: 401);
        }

        return Results.Ok(new OAuthTokenResponse(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.ExpiresIn,
            tokens.TokenType
        ));
    }

    private static async Task<IResult> Logout(
        HttpContext context,
        LogoutRequest? request,
        AuthentikOAuthService authentikService)
    {
        // Revoke the refresh token at Authentik if provided
        if (request?.RefreshToken is { } refreshToken && !string.IsNullOrEmpty(refreshToken))
        {
            await authentikService.RevokeTokenAsync(refreshToken);
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
public record LogoutRequest(string? RefreshToken);
