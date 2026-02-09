using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
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
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .Produces<ValidationErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Register a new user")
            .WithDescription("Creates a new user account and returns a JWT token");

        group.MapPost("/login", Login)
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Login with credentials")
            .WithDescription("Authenticates a user and returns a JWT token");

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

        var token = jwtService.GenerateToken(user);
        return Results.Ok(new AuthResponse(
            token,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        AppDbContext db,
        JwtService jwtService)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Results.Unauthorized();
        }

        var token = jwtService.GenerateToken(user);
        return Results.Ok(new AuthResponse(
            token,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
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
