using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Abstractions;
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
        group.MapPost("/language", SetLanguage);
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
            return Results.BadRequest(new { 
                message = localizer["ValidationFailed"], 
                errors = validationResult.Errors 
            });
        }

        if (await db.Users.AnyAsync(u => u.Username == request.Username))
        {
            return Results.BadRequest(new { message = localizer["UsernameAlreadyExists"] });
        }

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = string.IsNullOrEmpty(request.DisplayName) ? request.Username : request.DisplayName
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        
        // Create a personal group for the user
        var personalGroup = new Group
        {
            Name = $"{user.DisplayName}'s Personal",
            InviteCode = GenerateInviteCode(),
            CreatedByUserId = user.Id,
            IsPrivate = false,
            GroupType = GroupType.Personal,
            DefaultRole = GroupRole.Owner
        };
        
        db.Groups.Add(personalGroup);
        await db.SaveChangesAsync();
        
        // Add user as owner of their personal group
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

        return Results.Ok(new { language = culture });
    }
    
    private static string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = Random.Shared;
        return new string(Enumerable.Range(0, 8).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}

public record SetLanguageRequest(string Language);
