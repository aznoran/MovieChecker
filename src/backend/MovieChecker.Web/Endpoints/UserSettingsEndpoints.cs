using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class UserSettingsEndpoints
{
    public static void MapUserSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/user-settings").RequireAuthorization();

        group.MapGet("/", GetSettings);
        group.MapPut("/", UpdateSettings);
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static async Task<IResult> GetSettings(ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        
        var settings = await db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings == null)
        {
            // Create default settings if they don't exist
            settings = new UserSettings
            {
                UserId = userId,
                PreventAutoAddToPersonal = false
            };
            db.UserSettings.Add(settings);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new UserSettingsDto(settings.PreventAutoAddToPersonal));
    }

    private static async Task<IResult> UpdateSettings(
        UpdateUserSettingsRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);
        
        var settings = await db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings == null)
        {
            settings = new UserSettings
            {
                UserId = userId,
                PreventAutoAddToPersonal = request.PreventAutoAddToPersonal ?? false
            };
            db.UserSettings.Add(settings);
        }
        else
        {
            if (request.PreventAutoAddToPersonal.HasValue)
                settings.PreventAutoAddToPersonal = request.PreventAutoAddToPersonal.Value;
            
            settings.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new UserSettingsDto(settings.PreventAutoAddToPersonal));
    }
}
