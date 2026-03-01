using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Middleware;

/// <summary>
/// Lazily provisions a user record the first time they make an authenticated request.
/// Uses HybridCache so the DB is only queried once per user across the lifetime of the cache entry.
/// </summary>
public class UserProvisioningMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db, HybridCache cache)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(sub) && Guid.TryParse(sub, out var userId))
            {
                var exists = await cache.GetOrCreateAsync(
                    $"user_exists_{sub}",
                    async ct => await db.Users.AnyAsync(u => u.Id == userId, ct));

                if (!exists)
                {
                    var username = context.User.FindFirstValue("preferred_username") ?? sub;
                    var displayName = context.User.FindFirstValue(ClaimTypes.Name) ?? username;

                    var existing = await db.Users.FirstOrDefaultAsync(u => u.Id == userId || u.Username == username);
                    if (existing is null)
                    {
                        db.Users.Add(new User { Id = userId, Username = username, DisplayName = displayName });
                        await db.SaveChangesAsync();
                    }
                    else
                    {
                        existing.Username = username;
                        existing.DisplayName = displayName;
                        await db.SaveChangesAsync();
                    }

                    await cache.SetAsync($"user_exists_{sub}", true);
                }
            }
        }

        await next(context);
    }
}
