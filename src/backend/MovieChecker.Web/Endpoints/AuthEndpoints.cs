using System.Security.Claims;
using MovieChecker.Domain.Models.Dtos;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/me", GetCurrentUser)
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .WithSummary("Get current user")
            .WithDescription("Returns the current authenticated user's info from JWT claims.");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static IResult GetCurrentUser(HttpContext ctx)
    {
        var sub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? ctx.User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var userId))
            return Results.Unauthorized();

        var username = ctx.User.FindFirstValue("preferred_username")
                       ?? ctx.User.FindFirstValue("nickname")
                       ?? "";
        var displayName = ctx.User.FindFirstValue("name")
                       ?? ctx.User.FindFirstValue(ClaimTypes.Name)
                       ?? username;
        return Results.Ok(new UserDto(userId, username, displayName));
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
