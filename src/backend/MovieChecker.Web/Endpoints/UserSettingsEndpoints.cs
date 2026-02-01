using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class UserSettingsEndpoints
{
    public static void MapUserSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/user-settings")
            .RequireAuthorization()
            .WithTags("User Settings");

        group.MapGet("/", GetSettings)
            .WithDescription("Get user settings");
        
        group.MapPut("/", UpdateSettings)
            .WithDescription("Update user settings");
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
                PreventOthersAddingToMyPersonal = false,
                PreventMeAddingToMyPersonal = false
            };
            db.UserSettings.Add(settings);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new UserSettingsDto(
            settings.PreventOthersAddingToMyPersonal,
            settings.PreventMeAddingToMyPersonal
        ));
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
                PreventOthersAddingToMyPersonal = request.PreventOthersAddingToMyPersonal ?? false,
                PreventMeAddingToMyPersonal = request.PreventMeAddingToMyPersonal ?? false
            };
            db.UserSettings.Add(settings);
        }
        else
        {
            if (request.PreventOthersAddingToMyPersonal.HasValue)
                settings.PreventOthersAddingToMyPersonal = request.PreventOthersAddingToMyPersonal.Value;
            
            if (request.PreventMeAddingToMyPersonal.HasValue)
                settings.PreventMeAddingToMyPersonal = request.PreventMeAddingToMyPersonal.Value;
            
            settings.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new UserSettingsDto(
            settings.PreventOthersAddingToMyPersonal,
            settings.PreventMeAddingToMyPersonal
        ));
    }
}
