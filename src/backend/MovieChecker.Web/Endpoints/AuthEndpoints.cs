using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/refresh", RefreshToken);
        group.MapPost("/language", SetLanguage);
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        AppDbContext db,
        JwtService jwtService,
        ValidationService validationService)
    {
        // Validate input
        var validationResult = validationService.ValidateRegistration(
            request.Username,
            request.Password,
            request.DisplayName
        );

        if (!validationResult.IsValid)
        {
            return Results.BadRequest(new { 
                message = "Validation failed", 
                errors = validationResult.Errors 
            });
        }

        if (await db.Users.AnyAsync(u => u.Username == request.Username))
        {
            return Results.BadRequest(new { message = "Username already exists" });
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
        var refreshToken = jwtService.GenerateRefreshToken(user.Id);
        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync();

        return Results.Ok(new AuthResponse(
            token,
            refreshToken.Token,
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
        var refreshToken = jwtService.GenerateRefreshToken(user.Id);
        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync();

        return Results.Ok(new AuthResponse(
            token,
            refreshToken.Token,
            new UserDto(user.Id, user.Username, user.DisplayName)
        ));
    }

    private static async Task<IResult> RefreshToken(
        RefreshTokenRequest request,
        AppDbContext db,
        JwtService jwtService)
    {
        var existingRefreshToken = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (existingRefreshToken == null || !existingRefreshToken.IsActive)
        {
            return Results.Unauthorized();
        }

        // Revoke the old refresh token
        existingRefreshToken.RevokedAt = DateTime.UtcNow;

        // Generate new tokens
        var user = existingRefreshToken.User;
        var newAccessToken = jwtService.GenerateToken(user);
        var newRefreshToken = jwtService.GenerateRefreshToken(user.Id);
        db.RefreshTokens.Add(newRefreshToken);
        await db.SaveChangesAsync();

        return Results.Ok(new AuthResponse(
            newAccessToken,
            newRefreshToken.Token,
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

        return Results.Ok(new { language = culture });
    }
}

public record SetLanguageRequest(string Language);
