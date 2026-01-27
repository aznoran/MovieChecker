using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Api.Data;
using MovieChecker.Api.Models;

namespace MovieChecker.Api.Endpoints;

public static class WatchEntryEndpoints
{
    public static void MapWatchEntryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/watch-entries").RequireAuthorization();

        group.MapGet("/", GetAll);
        group.MapGet("/{id:int}", GetById);
        group.MapPost("/", Create);
        group.MapPut("/{id:int}", Update);
        group.MapDelete("/{id:int}", Delete);
        group.MapGet("/stats", GetStats);
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static async Task<IResult> GetAll(
        ClaimsPrincipal user,
        AppDbContext db,
        WatchStatus? status = null,
        WatchedBy? watchedBy = null)
    {
        var userId = GetUserId(user);
        var query = db.WatchEntries
            .Include(w => w.Movie)
            .Where(w => w.UserId == userId);

        if (status.HasValue)
        {
            query = query.Where(w => w.Status == status.Value);
        }

        if (watchedBy.HasValue)
        {
            query = query.Where(w => w.WatchedBy == watchedBy.Value);
        }

        var entries = await query
            .OrderByDescending(w => w.UpdatedAt)
            .Select(w => new WatchEntryDto(
                w.Id,
                w.MovieId,
                new MovieDto(
                    w.Movie.Id,
                    w.Movie.Title,
                    w.Movie.Description,
                    w.Movie.Type,
                    w.Movie.Year,
                    w.Movie.Genre,
                    w.Movie.PosterUrl,
                    w.Movie.CreatedAt
                ),
                w.Status,
                w.WatchedBy,
                w.MyRating,
                w.PartnerRating,
                w.Emotion,
                w.Comment,
                w.StartedAt,
                w.CompletedAt,
                w.CreatedAt,
                w.UpdatedAt
            ))
            .ToListAsync();

        return Results.Ok(entries);
    }

    private static async Task<IResult> GetById(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Movie)
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

        if (entry == null)
        {
            return Results.NotFound();
        }

        return Results.Ok(new WatchEntryDto(
            entry.Id,
            entry.MovieId,
            new MovieDto(
                entry.Movie.Id,
                entry.Movie.Title,
                entry.Movie.Description,
                entry.Movie.Type,
                entry.Movie.Year,
                entry.Movie.Genre,
                entry.Movie.PosterUrl,
                entry.Movie.CreatedAt
            ),
            entry.Status,
            entry.WatchedBy,
            entry.MyRating,
            entry.PartnerRating,
            entry.Emotion,
            entry.Comment,
            entry.StartedAt,
            entry.CompletedAt,
            entry.CreatedAt,
            entry.UpdatedAt
        ));
    }

    private static async Task<IResult> Create(
        CreateWatchEntryRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        if (!await db.Movies.AnyAsync(m => m.Id == request.MovieId))
        {
            return Results.BadRequest(new { message = "Movie not found" });
        }

        if (await db.WatchEntries.AnyAsync(w => w.MovieId == request.MovieId && w.UserId == userId))
        {
            return Results.BadRequest(new { message = "Watch entry already exists for this movie" });
        }

        var entry = new WatchEntry
        {
            MovieId = request.MovieId,
            UserId = userId,
            Status = request.Status,
            WatchedBy = request.WatchedBy,
            MyRating = request.MyRating.HasValue ? Math.Clamp(request.MyRating.Value, 1, 10) : null,
            PartnerRating = request.PartnerRating.HasValue ? Math.Clamp(request.PartnerRating.Value, 1, 10) : null,
            Emotion = request.Emotion,
            Comment = request.Comment,
            PrivateComment = request.PrivateComment,
            StartedAt = request.StartedAt,
            CompletedAt = request.CompletedAt
        };

        db.WatchEntries.Add(entry);
        await db.SaveChangesAsync();

        var movie = await db.Movies.FindAsync(request.MovieId);

        return Results.Created($"/api/watch-entries/{entry.Id}", new WatchEntryDto(
            entry.Id,
            entry.MovieId,
            new MovieDto(
                movie!.Id,
                movie.Title,
                movie.Description,
                movie.Type,
                movie.Year,
                movie.Genre,
                movie.PosterUrl,
                movie.CreatedAt
            ),
            entry.Status,
            entry.WatchedBy,
            entry.MyRating,
            entry.PartnerRating,
            entry.Emotion,
            entry.Comment,
            entry.StartedAt,
            entry.CompletedAt,
            entry.CreatedAt,
            entry.UpdatedAt
        ));
    }

    private static async Task<IResult> Update(
        int id,
        UpdateWatchEntryRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Movie)
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

        if (entry == null)
        {
            return Results.NotFound();
        }

        if (request.Status.HasValue) entry.Status = request.Status.Value;
        if (request.WatchedBy.HasValue) entry.WatchedBy = request.WatchedBy.Value;
        if (request.MyRating.HasValue) entry.MyRating = Math.Clamp(request.MyRating.Value, 1, 10);
        if (request.PartnerRating.HasValue) entry.PartnerRating = Math.Clamp(request.PartnerRating.Value, 1, 10);
        if (request.Emotion.HasValue) entry.Emotion = request.Emotion.Value;
        if (request.Comment != null) entry.Comment = request.Comment;
        if (request.PrivateComment != null) entry.PrivateComment = request.PrivateComment;
        if (request.StartedAt.HasValue) entry.StartedAt = request.StartedAt.Value;
        if (request.CompletedAt.HasValue) entry.CompletedAt = request.CompletedAt.Value;

        entry.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new WatchEntryDto(
            entry.Id,
            entry.MovieId,
            new MovieDto(
                entry.Movie.Id,
                entry.Movie.Title,
                entry.Movie.Description,
                entry.Movie.Type,
                entry.Movie.Year,
                entry.Movie.Genre,
                entry.Movie.PosterUrl,
                entry.Movie.CreatedAt
            ),
            entry.Status,
            entry.WatchedBy,
            entry.MyRating,
            entry.PartnerRating,
            entry.Emotion,
            entry.Comment,
            entry.StartedAt,
            entry.CompletedAt,
            entry.CreatedAt,
            entry.UpdatedAt
        ));
    }

    private static async Task<IResult> Delete(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries.FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);

        if (entry == null)
        {
            return Results.NotFound();
        }

        db.WatchEntries.Remove(entry);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static async Task<IResult> GetStats(ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        var entries = await db.WatchEntries
            .Include(w => w.Movie)
            .Where(w => w.UserId == userId)
            .ToListAsync();

        var stats = new StatsDto(
            TotalWatched: entries.Count(e => e.Status == WatchStatus.Completed),
            TotalPlanned: entries.Count(e => e.Status == WatchStatus.Planned),
            TotalWatching: entries.Count(e => e.Status == WatchStatus.Watching),
            TotalDropped: entries.Count(e => e.Status == WatchStatus.Dropped),
            AverageMyRating: entries.Where(e => e.MyRating.HasValue).Select(e => e.MyRating!.Value).DefaultIfEmpty().Average(),
            AveragePartnerRating: entries.Where(e => e.PartnerRating.HasValue).Select(e => e.PartnerRating!.Value).DefaultIfEmpty().Average(),
            WatchedTogether: entries.Count(e => e.WatchedBy == WatchedBy.Together),
            ByType: entries.GroupBy(e => e.Movie.Type.ToString()).ToDictionary(g => g.Key, g => g.Count()),
            ByEmotion: entries.Where(e => e.Emotion.HasValue).GroupBy(e => e.Emotion!.Value.ToString()).ToDictionary(g => g.Key, g => g.Count())
        );

        return Results.Ok(stats);
    }
}
