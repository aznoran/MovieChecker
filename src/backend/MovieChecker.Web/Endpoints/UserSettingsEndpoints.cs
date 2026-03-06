using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class UserSettingsEndpoints
{
    public static void MapUserSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/user-settings").RequireAuthorization();

        group.MapGet("/", GetSettings)
            .Produces<UserSettingsDto>(StatusCodes.Status200OK)
            .WithSummary("Get user settings")
            .WithDescription("Returns current user's settings");

        group.MapPut("/", UpdateSettings)
            .Produces<UserSettingsDto>(StatusCodes.Status200OK)
            .WithSummary("Update user settings")
            .WithDescription("Updates current user's settings");
    }

    private static Guid GetUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? user.FindFirstValue("sub")
                   ?? Guid.Empty.ToString());

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
            settings.PreventMeAddingToMyPersonal,
            settings.CardSize,
            settings.HasSeenTranslateHint
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
                PreventMeAddingToMyPersonal = request.PreventMeAddingToMyPersonal ?? false,
                CardSize = request.CardSize ?? "medium",
                HasSeenTranslateHint = request.HasSeenTranslateHint ?? false
            };
            db.UserSettings.Add(settings);
        }
        else
        {
            if (request.PreventOthersAddingToMyPersonal.HasValue)
                settings.PreventOthersAddingToMyPersonal = request.PreventOthersAddingToMyPersonal.Value;

            if (request.PreventMeAddingToMyPersonal.HasValue)
                settings.PreventMeAddingToMyPersonal = request.PreventMeAddingToMyPersonal.Value;

            if (request.CardSize != null)
                settings.CardSize = request.CardSize;

            if (request.HasSeenTranslateHint.HasValue)
                settings.HasSeenTranslateHint = request.HasSeenTranslateHint.Value;

            settings.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new UserSettingsDto(
            settings.PreventOthersAddingToMyPersonal,
            settings.PreventMeAddingToMyPersonal,
            settings.CardSize,
            settings.HasSeenTranslateHint
        ));
    }
}
