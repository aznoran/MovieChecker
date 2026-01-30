using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;

namespace MovieChecker.Web.Endpoints;

public static class CommentEndpoints
{
    public static void MapCommentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/watch-entries/{entryId:int}/comments").RequireAuthorization();

        group.MapGet("/", GetComments);
        group.MapPost("/", AddComment);
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static async Task<IResult> GetComments(
        int entryId,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Comments).ThenInclude(c => c.User)
            .FirstOrDefaultAsync(w => w.Id == entryId);

        if (entry == null)
            return Results.NotFound();

        // Check access
        if (entry.GroupId.HasValue)
        {
            var isMember = await db.GroupMembers
                .AnyAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);
            if (!isMember)
                return Results.Forbid();
        }
        else if (entry.UserId != userId)
        {
            return Results.NotFound();
        }

        var comments = entry.Comments
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new EntryCommentDto(
                c.Id,
                c.UserId,
                c.User.DisplayName,
                c.Text,
                c.CreatedAt
            ))
            .ToList();

        return Results.Ok(comments);
    }

    private static async Task<IResult> AddComment(
        int entryId,
        CreateCommentRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .FirstOrDefaultAsync(w => w.Id == entryId);

        if (entry == null)
            return Results.NotFound();

        // Check access
        if (entry.GroupId.HasValue)
        {
            var isMember = await db.GroupMembers
                .AnyAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);
            if (!isMember)
                return Results.Forbid();
        }
        else if (entry.UserId != userId)
        {
            return Results.NotFound();
        }

        // Validate comment text
        if (string.IsNullOrWhiteSpace(request.Text))
            return Results.BadRequest(new { message = "Comment text is required" });

        if (request.Text.Length > 1000)
            return Results.BadRequest(new { message = "Comment text is too long (max 1000 characters)" });

        var comment = new EntryComment
        {
            WatchEntryId = entryId,
            UserId = userId,
            Text = request.Text.Trim()
        };

        db.EntryComments.Add(comment);
        await db.SaveChangesAsync();

        // Reload with user
        await db.Entry(comment).Reference(c => c.User).LoadAsync();

        var dto = new EntryCommentDto(
            comment.Id,
            comment.UserId,
            comment.User.DisplayName,
            comment.Text,
            comment.CreatedAt
        );

        return Results.Created($"/api/watch-entries/{entryId}/comments/{comment.Id}", dto);
    }
}
