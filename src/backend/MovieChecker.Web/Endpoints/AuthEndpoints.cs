using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapGet("/me", GetCurrentUser)
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Get current user")
            .WithDescription("Returns the currently authenticated user's information from Authentik token");

        group.MapPost("/language", SetLanguage)
            .Produces<LanguageResponse>(StatusCodes.Status200OK)
            .WithSummary("Set preferred language")
            .WithDescription("Sets the user's preferred language (en or ru)");
    }

    private static async Task<IResult> GetCurrentUser(
        ClaimsPrincipal principal,
        AppDbContext db)
    {
        var userIdStr = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out var userId))
        {
            return Results.Unauthorized();
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new UserDto(user.Id, user.Username, user.DisplayName));
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
