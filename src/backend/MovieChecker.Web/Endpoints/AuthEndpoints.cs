using System.Security.Claims;
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

        group.MapGet("/me", GetCurrentUser)
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Get current user")
            .WithDescription("Returns the currently authenticated user's information from Authentik token");

        group.MapPost("/register", Register)
            .AllowAnonymous()
            .Produces<SuccessResponse>(StatusCodes.Status200OK)
            .Produces<ValidationErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces<ErrorResponse>(StatusCodes.Status409Conflict)
            .WithSummary("Register a new user")
            .WithDescription("Creates a new user account in Authentik. User can then sign in via OIDC.");

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

    private static async Task<IResult> Register(
        RegisterRequest request,
        ValidationService validationService,
        AuthentikApiService authentikApiService,
        ILocalizationService localizer)
    {
        var validation = validationService.ValidateRegistration(
            request.Username, request.Password, request.DisplayName, request.Email);

        if (!validation.IsValid)
        {
            return Results.BadRequest(new ValidationErrorResponse(localizer["ValidationFailed"], validation.Errors));
        }

        var (success, error) = await authentikApiService.CreateUserAsync(
            request.Username, request.Email ?? "", request.DisplayName, request.Password);

        if (!success)
        {
            if (error == "UsernameAlreadyExists")
            {
                return Results.Conflict(new ErrorResponse(localizer["UsernameAlreadyExists"]));
            }

            return Results.BadRequest(new ErrorResponse(localizer["RegistrationFailed"]));
        }

        return Results.Ok(new SuccessResponse(localizer["RegistrationSuccess"]));
    }
}

public record SetLanguageRequest(string Language);
