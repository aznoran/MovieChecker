using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Middleware;

/// <summary>
/// Upserts a lightweight user_profiles row from JWT claims on each authenticated request.
/// Cache key includes claim values so profile updates propagate automatically.
/// </summary>
public class ProfileSyncMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db, HybridCache cache)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                      ?? context.User.FindFirstValue("sub");
            if (!string.IsNullOrEmpty(sub) && Guid.TryParse(sub, out var userId))
            {
                var username = context.User.FindFirstValue("preferred_username")
                               ?? context.User.FindFirstValue("nickname")
                               ?? sub;
                var displayName = context.User.FindFirstValue("name")
                               ?? context.User.FindFirstValue(ClaimTypes.Name)
                               ?? username;

                // Cache key includes claim values — if Authentik updates name/username,
                // the key changes and we re-sync automatically.
                var cacheKey = $"profile_synced_{sub}_{displayName}_{username}";

                await cache.GetOrCreateAsync(cacheKey, async ct =>
                {
                    var profile = await db.UserProfiles.FindAsync([userId], ct);
                    if (profile is null)
                    {
                        db.UserProfiles.Add(new UserProfile
                        {
                            Id = userId,
                            DisplayName = displayName,
                            Username = username
                        });
                        await db.SaveChangesAsync(ct);
                    }
                    else if (profile.DisplayName != displayName || profile.Username != username)
                    {
                        profile.DisplayName = displayName;
                        profile.Username = username;
                        await db.SaveChangesAsync(ct);
                    }

                    return true;
                });
            }
        }

        await next(context);
    }
}
