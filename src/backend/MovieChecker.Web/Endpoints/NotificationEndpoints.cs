using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;
using System.Security.Claims;

namespace MovieChecker.Web.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/notifications").RequireAuthorization();

        group.MapGet("", GetNotifications);
        group.MapGet("/unread-count", GetUnreadCount);
        group.MapPut("/{id}/read", MarkAsRead);
        group.MapPut("/read-all", MarkAllAsRead);
        group.MapDelete("/{id}", DeleteNotification);
    }

    // Helper method to create notifications
    public static async Task CreateNotification(
        AppDbContext db,
        int userId,
        NotificationType type,
        string title,
        string message,
        int? relatedId = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            RelatedId = relatedId,
            IsRead = false
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
    }

    private static async Task<IResult> GetNotifications(
        ClaimsPrincipal user,
        AppDbContext db,
        int? limit = 50)
    {
        var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var notifications = await db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit ?? 50)
            .Select(n => new NotificationDto(
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.IsRead,
                n.RelatedId,
                n.CreatedAt
            ))
            .ToListAsync();

        return Results.Ok(notifications);
    }

    private static async Task<IResult> GetUnreadCount(
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var count = await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();

        return Results.Ok(new { count });
    }

    private static async Task<IResult> MarkAsRead(
        int id,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
        {
            return Results.NotFound();
        }

        notification.IsRead = true;
        await db.SaveChangesAsync();

        return Results.Ok();
    }

    private static async Task<IResult> MarkAllAsRead(
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(n => n.IsRead, true));

        return Results.Ok();
    }

    private static async Task<IResult> DeleteNotification(
        int id,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var notification = await db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
        {
            return Results.NotFound();
        }

        db.Notifications.Remove(notification);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }
}
