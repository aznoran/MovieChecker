using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

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
        group.MapPost("/{id:int}/rate", Rate);
    }

    private static int GetUserId(ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

    private static WatchEntryDto ToDto(WatchEntry w) => new(
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
        w.GroupId,
        w.Emotion,
        w.Comment,
        w.Ratings.Select(r => new EntryRatingDto(
            r.Id,
            r.UserId,
            r.User.DisplayName,
            r.Rating
        )).ToList(),
        w.StartedAt,
        w.CompletedAt,
        w.CreatedAt,
        w.UpdatedAt,
        w.CurrentSeason,
        w.CurrentEpisode,
        w.TotalEpisodes,
        w.WatchingTime
    );

    private static async Task<IResult> GetAll(
        ClaimsPrincipal user,
        AppDbContext db,
        WatchStatus? status = null,
        WatchedBy? watchedBy = null,
        int? groupId = null)
    {
        var userId = GetUserId(user);

        IQueryable<WatchEntry> query;

        if (groupId.HasValue)
        {
            // Verify user can view this group
            if (!await PermissionService.CanViewGroup(db, userId, groupId.Value))
                return Results.BadRequest(new { message = "Insufficient permissions to view this group" });

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings).ThenInclude(r => r.User)
                .Where(w => w.GroupId == groupId.Value);
        }
        else
        {
            // Personal entries only (no group)
            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings).ThenInclude(r => r.User)
                .Where(w => w.UserId == userId && w.GroupId == null);
        }

        if (status.HasValue)
            query = query.Where(w => w.Status == status.Value);

        if (watchedBy.HasValue)
            query = query.Where(w => w.WatchedBy == watchedBy.Value);

        var entries = await query
            .OrderByDescending(w => w.UpdatedAt)
            .ToListAsync();

        return Results.Ok(entries.Select(ToDto).ToList());
    }

    private static async Task<IResult> GetById(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Movie)
            .Include(w => w.Ratings).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check access
        if (entry.GroupId.HasValue)
        {
            var isMember = await db.GroupMembers
                .AnyAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);
            if (!isMember)
                return Results.BadRequest(new { message = "Insufficient permissions to view this entry" });
        }
        else if (entry.UserId != userId)
        {
            return Results.NotFound();
        }

        return Results.Ok(ToDto(entry));
    }

    private static async Task<IResult> Create(
        CreateWatchEntryRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);

        if (!await db.Movies.AnyAsync(m => m.Id == request.MovieId))
            return Results.BadRequest(new { message = "Movie not found" });

        // Validate group membership if group specified
        if (request.GroupId.HasValue)
        {
            // Check if user can create in this group
            if (!await PermissionService.CanCreateInGroup(db, userId, request.GroupId.Value))
                return Results.BadRequest(new { message = "Insufficient permissions to create entries in this group" });

            // Check duplicate within group
            if (await db.WatchEntries.AnyAsync(w => w.MovieId == request.MovieId && w.GroupId == request.GroupId.Value))
                return Results.BadRequest(new { message = "Entry already exists in this group" });
        }
        else
        {
            // Check duplicate for personal entries
            if (await db.WatchEntries.AnyAsync(w =>
                    w.MovieId == request.MovieId && w.UserId == userId && w.GroupId == null))
                return Results.BadRequest(new { message = "Watch entry already exists for this movie" });
        }

        var entry = new WatchEntry
        {
            MovieId = request.MovieId,
            UserId = userId,
            GroupId = request.GroupId,
            Status = request.Status,
            WatchedBy = request.WatchedBy,
            MyRating = request.MyRating.HasValue ? Math.Clamp(request.MyRating.Value, 1, 10) : null,
            PartnerRating = request.PartnerRating.HasValue ? Math.Clamp(request.PartnerRating.Value, 1, 10) : null,
            Emotion = request.Emotion,
            Comment = request.Comment,
            PrivateComment = request.PrivateComment,
            StartedAt = request.StartedAt,
            CompletedAt = request.CompletedAt,
            CurrentSeason = request.CurrentSeason,
            CurrentEpisode = request.CurrentEpisode,
            TotalEpisodes = request.TotalEpisodes,
            WatchingTime = request.WatchingTime,
        };

        db.WatchEntries.Add(entry);
        await db.SaveChangesAsync();

        // Add bulk ratings if provided (group mode)
        if (request.Ratings is { Count: > 0 })
        {
            // Get valid group member user IDs
            var validUserIds = request.GroupId.HasValue
                ? await db.GroupMembers
                    .Where(m => m.GroupId == request.GroupId.Value)
                    .Select(m => m.UserId)
                    .ToListAsync()
                : new List<int> { userId };

            foreach (var ri in request.Ratings)
            {
                if (validUserIds.Contains(ri.UserId))
                {
                    db.EntryRatings.Add(new EntryRating
                    {
                        WatchEntryId = entry.Id,
                        UserId = ri.UserId,
                        Rating = Math.Clamp(ri.Rating, 1, 10)
                    });
                }
            }

            await db.SaveChangesAsync();
        }
        else if (request.Rating.HasValue)
        {
            // Single own rating (backward compat)
            db.EntryRatings.Add(new EntryRating
            {
                WatchEntryId = entry.Id,
                UserId = userId,
                Rating = Math.Clamp(request.Rating.Value, 1, 10)
            });
            await db.SaveChangesAsync();
        }

        // Reload with includes
        entry = await db.WatchEntries
            .Include(w => w.Movie)
            .Include(w => w.Ratings).ThenInclude(r => r.User)
            .FirstAsync(w => w.Id == entry.Id);

        return Results.Created($"/api/watch-entries/{entry.Id}", ToDto(entry));
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
            .Include(w => w.Ratings).ThenInclude(r => r.User)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check edit permission
        if (!await PermissionService.CanEditEntry(db, userId, entry))
            return Results.BadRequest(new { message = "Insufficient permissions to edit this entry" });

        if (request.Status.HasValue) entry.Status = request.Status.Value;
        if (request.WatchedBy.HasValue) entry.WatchedBy = request.WatchedBy.Value;
        if (request.MyRating.HasValue) entry.MyRating = Math.Clamp(request.MyRating.Value, 1, 10);
        if (request.PartnerRating.HasValue) entry.PartnerRating = Math.Clamp(request.PartnerRating.Value, 1, 10);
        if (request.Emotion.HasValue) entry.Emotion = request.Emotion.Value;
        if (request.Comment != null) entry.Comment = request.Comment;
        if (request.PrivateComment != null) entry.PrivateComment = request.PrivateComment;
        if (request.StartedAt.HasValue) entry.StartedAt = request.StartedAt.Value;
        if (request.CompletedAt.HasValue) entry.CompletedAt = request.CompletedAt.Value;
        if (request.CurrentSeason.HasValue) entry.CurrentSeason = request.CurrentSeason.Value;
        if (request.CurrentEpisode.HasValue) entry.CurrentEpisode = request.CurrentEpisode.Value;
        if (request.TotalEpisodes.HasValue) entry.TotalEpisodes = request.TotalEpisodes.Value;
        if (request.WatchingTime.HasValue) entry.WatchingTime = request.WatchingTime.Value;

        // Handle bulk ratings if provided (group mode)
        if (request.Ratings is { Count: > 0 })
        {
            var validUserIds = entry.GroupId.HasValue
                ? await db.GroupMembers
                    .Where(m => m.GroupId == entry.GroupId.Value)
                    .Select(m => m.UserId)
                    .ToListAsync()
                : new List<int> { userId };

            // Remove ratings for users not in the new list
            var submittedUserIds = request.Ratings.Select(r => r.UserId).ToHashSet();
            var toRemove = entry.Ratings.Where(r => !submittedUserIds.Contains(r.UserId)).ToList();
            db.EntryRatings.RemoveRange(toRemove);

            foreach (var ri in request.Ratings)
            {
                if (!validUserIds.Contains(ri.UserId)) continue;
                var existing = entry.Ratings.FirstOrDefault(r => r.UserId == ri.UserId);
                if (existing != null)
                {
                    existing.Rating = Math.Clamp(ri.Rating, 1, 10);
                }
                else
                {
                    db.EntryRatings.Add(new EntryRating
                    {
                        WatchEntryId = entry.Id,
                        UserId = ri.UserId,
                        Rating = Math.Clamp(ri.Rating, 1, 10)
                    });
                }
            }
        }
        else if (request.Rating.HasValue)
        {
            // Single own rating (backward compat)
            var existing = entry.Ratings.FirstOrDefault(r => r.UserId == userId);
            if (existing != null)
            {
                existing.Rating = Math.Clamp(request.Rating.Value, 1, 10);
            }
            else
            {
                db.EntryRatings.Add(new EntryRating
                {
                    WatchEntryId = entry.Id,
                    UserId = userId,
                    Rating = Math.Clamp(request.Rating.Value, 1, 10)
                });
            }
        }

        entry.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Reload ratings
        await db.Entry(entry).Collection(e => e.Ratings).LoadAsync();
        foreach (var r in entry.Ratings)
            await db.Entry(r).Reference(x => x.User).LoadAsync();

        return Results.Ok(ToDto(entry));
    }

    private static async Task<IResult> Rate(
        int id,
        RateRequest request,
        ClaimsPrincipal user,
        AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Ratings)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check access - members can rate entries in their group
        if (entry.GroupId.HasValue)
        {
            if (!await PermissionService.CanViewGroup(db, userId, entry.GroupId.Value))
                return Results.BadRequest(new { message = "Insufficient permissions to rate this entry" });
        }
        else if (entry.UserId != userId)
        {
            return Results.NotFound();
        }

        var rating = Math.Clamp(request.Rating, 1, 10);
        var existing = entry.Ratings.FirstOrDefault(r => r.UserId == userId);
        if (existing != null)
        {
            existing.Rating = rating;
        }
        else
        {
            db.EntryRatings.Add(new EntryRating
            {
                WatchEntryId = entry.Id,
                UserId = userId,
                Rating = rating
            });
        }

        await db.SaveChangesAsync();
        return Results.Ok(new { rating });
    }

    private static async Task<IResult> Delete(int id, ClaimsPrincipal user, AppDbContext db)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries.FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check delete permission
        if (!await PermissionService.CanDeleteEntry(db, userId, entry))
            return Results.BadRequest(new { message = "Insufficient permissions to delete this entry" });

        db.WatchEntries.Remove(entry);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static async Task<IResult> GetStats(
        ClaimsPrincipal user,
        AppDbContext db,
        int? groupId = null)
    {
        var userId = GetUserId(user);

        IQueryable<WatchEntry> query;

        if (groupId.HasValue)
        {
            if (!await PermissionService.CanViewGroup(db, userId, groupId.Value))
                return Results.BadRequest(new { message = "Insufficient permissions to view group statistics" });

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings)
                .ThenInclude(x => x.User)
                .Where(w => w.GroupId == groupId.Value);
        }
        else
        {
            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings)
                .ThenInclude(x => x.User)
                .Where(w => w.UserId == userId && w.GroupId == null);
        }

        var entries = await query.ToListAsync();

        var allRatings = entries
            .SelectMany(e => e.Ratings)
            .ToList();
        var myRatings = allRatings
            .Where(r => r.UserId == userId)
            .Select(r => r.Rating)
            .ToList();
        var otherRatings = allRatings
            .Where(r => r.UserId != userId)
            .Select(r => r.Rating)
            .ToList();

        var stats = new StatsDto(
            TotalWatched: entries.Count(e => e.Status == WatchStatus.Completed),
            TotalPlanned: entries.Count(e => e.Status == WatchStatus.Planned),
            TotalWatching: entries.Count(e => e.Status == WatchStatus.Watching),
            TotalDropped: entries.Count(e => e.Status == WatchStatus.Dropped),
            AverageMyRating: myRatings.Count > 0 ? myRatings.Average() : 0,
            AveragePartnerRating: otherRatings.Count > 0 ? otherRatings.Average() : 0,
            WatchedTogether: entries.Count(e => e.WatchedBy == WatchedBy.Together),
            ByType: entries.GroupBy(e => e.Movie.Type.ToString()).ToDictionary(g => g.Key, g => g.Count()),
            ByEmotion: entries.Where(e => e.Emotion.HasValue).GroupBy(e => e.Emotion!.Value.ToString())
                .ToDictionary(g => g.Key, g => g.Count()),
            MemberRatings: allRatings
                .GroupBy(r => r.UserId)
                .Select(g => new MemberRatingDto(
                    g.Key,
                    g.Select(r => r.User.DisplayName).FirstOrDefault() ?? string.Empty,
                    (int)Math.Round(g.Average(r => r.Rating)),
                    g.Count()
                ))
                .ToList()
        );

        return Results.Ok(stats);
    }
}

public record RateRequest(int Rating);