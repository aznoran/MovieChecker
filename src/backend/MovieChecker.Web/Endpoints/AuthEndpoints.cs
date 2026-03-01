using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/provision", Provision)
            .RequireAuthorization()
            .Produces<ProvisionResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Provision user")
            .WithDescription(
                "Creates or updates a local user from the Authentik JWT. Called once per login from the frontend callback page.");

        group.MapGet("/me", GetCurrentUser)
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get current user")
            .WithDescription("Returns the current authenticated user's info.");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static async Task<IResult> Provision(
        HttpContext httpContext,
        AppDbContext db,
        HybridCache cache,
        IConfiguration configuration)
    {
        var authHeader = httpContext.Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ")) return Results.Unauthorized();
        var token = authHeader["Bearer ".Length..];

        var handler = new JwtSecurityTokenHandler();
        if (!handler.CanReadToken(token)) return Results.Unauthorized();
        var jwt = handler.ReadJwtToken(token);

        var sub = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Results.BadRequest(new ErrorResponse("Invalid sub claim"));

        var username = jwt.Claims.FirstOrDefault(c => c.Type == "preferred_username")?.Value ?? sub;
        var displayName = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value ?? username;

        var user = await db.Users.FindAsync(userId);
        bool isNewUser = user is null;

        if (user is null)
        {
            user = new User { Id = userId, Username = username, DisplayName = displayName };
            db.Users.Add(user);
            await db.SaveChangesAsync();
            // Personal group is created lazily on first GET /api/groups request
        }
        else if (user.DisplayName != displayName)
        {
            user.DisplayName = displayName;
            await db.SaveChangesAsync();
        }

        // Warm up the exists-cache so OnTokenValidated succeeds immediately after
        await cache.SetAsync($"user_exists_{sub}", true);

        return Results.Ok(new ProvisionResponse(
            new UserDto(user.Id, user.Username, user.DisplayName),
            isNewUser));
    }

    private static async Task<IResult> GetCurrentUser(HttpContext ctx, AppDbContext db)
    {
        var userId = Guid.Parse(ctx.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FindAsync(userId);
        return user is null ? Results.NotFound() : Results.Ok(new UserDto(user.Id, user.Username, user.DisplayName));
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
public record ProvisionResponse(UserDto User, bool IsNewUser);
