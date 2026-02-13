using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Entities;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Abstractions;
using MovieChecker.Infrastructure.Data;
using MovieChecker.Infrastructure.Services;

namespace MovieChecker.Web.Endpoints;

public static class WatchEntryEndpoints
{
    public static void MapWatchEntryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/watch-entries").RequireAuthorization();

        group.MapGet("/", GetAll)
            .Produces<List<WatchEntryDto>>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Get all watch entries")
            .WithDescription("Returns all watch entries for the current user or group");

        group.MapGet("/{id:int}", GetById)
            .Produces<WatchEntryDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Get watch entry by ID")
            .WithDescription("Returns a single watch entry by its ID");

        group.MapPost("/", Create)
            .Produces<WatchEntryDto>(StatusCodes.Status201Created)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Create a new watch entry")
            .WithDescription("Creates a new watch entry for a movie");

        group.MapPut("/{id:int}", Update)
            .Produces<WatchEntryDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Update a watch entry")
            .WithDescription("Updates an existing watch entry");

        group.MapDelete("/{id:int}", Delete)
            .Produces(StatusCodes.Status204NoContent)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Delete a watch entry")
            .WithDescription("Deletes a watch entry by its ID");

        group.MapGet("/stats", GetStats)
            .Produces<StatsDto>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .WithSummary("Get watch statistics")
            .WithDescription("Returns statistics for the current user's or group's watch entries");

        group.MapPost("/{id:int}/rate", Rate)
            .Produces<RatingResponse>(StatusCodes.Status200OK)
            .Produces<ErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithSummary("Rate a watch entry")
            .WithDescription("Adds or updates a rating for a watch entry");
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
        ILocalizationService localizer,
        WatchStatus? status = null,
        int? groupId = null)
    {
        var userId = GetUserId(user);

        IQueryable<WatchEntry> query;

        if (groupId.HasValue)
        {
            // Verify user can view this group
            if (!await PermissionService.CanViewGroup(db, userId, groupId.Value))
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsView"]));

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings).ThenInclude(r => r.User)
                .Where(w => w.WatchEntryGroups.Any(weg => weg.GroupId == groupId.Value)
                            || w.GroupId == groupId.Value);
        }
        else
        {
            // Personal entries only (no group) — backward compat for old entries with GroupId == null
            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings).ThenInclude(r => r.User)
                .Where(w => w.UserId == userId && w.GroupId == null);
        }

        if (status.HasValue)
            query = query.Where(w => w.Status == status.Value);

        var entries = await query
            .OrderByDescending(w => w.UpdatedAt)
            .ToListAsync();

        return Results.Ok(entries.Select(ToDto).ToList());
    }

    private static async Task<IResult> GetById(int id, ClaimsPrincipal user, AppDbContext db, ILocalizationService localizer)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Movie)
            .Include(w => w.Ratings).ThenInclude(r => r.User)
            .Include(w => w.WatchEntryGroups)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check access via junction table or legacy GroupId
        var entryGroupIds = entry.WatchEntryGroups.Select(weg => weg.GroupId).ToList();
        if (entry.GroupId.HasValue && !entryGroupIds.Contains(entry.GroupId.Value))
            entryGroupIds.Add(entry.GroupId.Value);

        if (entryGroupIds.Count > 0)
        {
            var isMember = await db.GroupMembers
                .AnyAsync(m => entryGroupIds.Contains(m.GroupId) && m.UserId == userId);
            if (!isMember)
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsViewEntry"]));
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
        AppDbContext db,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);

        // Validate field lengths
        if (request.Comment != null && request.Comment.Length > 1000)
            return Results.BadRequest(new ErrorResponse("Comment must not exceed 1000 characters"));

        // Validate emotion - cannot set emotion for Planned or Watching status
        if (request.Emotion.HasValue && (request.Status == WatchStatus.Planned || request.Status == WatchStatus.Watching))
            return Results.BadRequest(new ErrorResponse("Emotion can only be set for Completed or Dropped status"));

        if (!await db.Movies.AnyAsync(m => m.Id == request.MovieId))
            return Results.BadRequest(new ErrorResponse(localizer["MovieNotFound"]));

        // Validate group membership if group specified
        if (request.GroupId.HasValue)
        {
            // Check if user can create in this group
            if (!await PermissionService.CanCreateInGroup(db, userId, request.GroupId.Value))
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsCreate"]));

            // Check duplicate within group (via junction table or legacy GroupId)
            if (await db.WatchEntries.AnyAsync(w => w.MovieId == request.MovieId
                    && (w.GroupId == request.GroupId.Value
                        || w.WatchEntryGroups.Any(weg => weg.GroupId == request.GroupId.Value))))
                return Results.BadRequest(new ErrorResponse(localizer["EntryAlreadyExistsGroup"]));
        }
        else
        {
            // Check duplicate for personal entries (legacy entries with GroupId == null)
            if (await db.WatchEntries.AnyAsync(w =>
                    w.MovieId == request.MovieId && w.UserId == userId && w.GroupId == null))
                return Results.BadRequest(new ErrorResponse(localizer["EntryAlreadyExists"]));
        }

        var entry = new WatchEntry
        {
            MovieId = request.MovieId,
            UserId = userId,
            GroupId = request.GroupId,
            Status = request.Status,
            MyRating = request.MyRating.HasValue ? request.MyRating.Value : null,
            PartnerRating = request.PartnerRating.HasValue ? request.PartnerRating.Value : null,
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

        // Add junction table row for the main group
        if (request.GroupId.HasValue)
        {
            db.WatchEntryGroups.Add(new WatchEntryGroup
            {
                WatchEntryId = entry.Id,
                GroupId = request.GroupId.Value
            });
        }

        // Link entry to personal groups of viewers via junction table (instead of duplicating)
        if (request.GroupId.HasValue && request.Viewers is { Count: > 0 })
        {
            var viewerUserIds = request.Viewers.Distinct().ToList();

            // Get user settings to check privacy preferences
            var userSettings = await db.UserSettings
                .Where(s => viewerUserIds.Contains(s.UserId))
                .ToDictionaryAsync(s => s.UserId);

            // Get personal groups for viewers
            var personalGroups = await db.Groups
                .Where(g => g.GroupType == GroupType.Personal && viewerUserIds.Contains(g.CreatedByUserId))
                .ToDictionaryAsync(g => g.CreatedByUserId);

            // Pre-fetch existing WatchEntryGroup links for this entry to avoid N+1 queries
            var existingLinks = await db.WatchEntryGroups
                .Where(weg => weg.WatchEntryId == entry.Id)
                .Select(weg => weg.GroupId)
                .ToHashSetAsync();

            foreach (var viewerUserId in viewerUserIds)
            {
                // Check if user has disabled auto-add to personal
                var settings = userSettings.GetValueOrDefault(viewerUserId);
                bool preventAutoAdd = false;

                if (settings != null)
                {
                    if (viewerUserId == userId)
                        preventAutoAdd = settings.PreventMeAddingToMyPersonal;
                    else
                        preventAutoAdd = settings.PreventOthersAddingToMyPersonal;
                }

                if (!preventAutoAdd && personalGroups.TryGetValue(viewerUserId, out var personalGroup))
                {
                    if (!existingLinks.Contains(personalGroup.Id))
                    {
                        db.WatchEntryGroups.Add(new WatchEntryGroup
                        {
                            WatchEntryId = entry.Id,
                            GroupId = personalGroup.Id
                        });
                        existingLinks.Add(personalGroup.Id);
                    }
                }
            }
        }

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
                        Rating = ri.Rating
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
                Rating = request.Rating.Value
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
        AppDbContext db,
        ILocalizationService localizer)
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
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsEdit"]));

        // Validate field lengths
        if (request.Comment != null && request.Comment.Length > 1000)
            return Results.BadRequest(new ErrorResponse("Comment must not exceed 1000 characters"));

        // Validate emotion - cannot set emotion for Planned or Watching status
        var effectiveStatus = request.Status ?? entry.Status;
        if (request.Emotion.HasValue && (effectiveStatus == WatchStatus.Planned || effectiveStatus == WatchStatus.Watching))
            return Results.BadRequest(new ErrorResponse("Emotion can only be set for Completed or Dropped status"));

        if (request.Status.HasValue) entry.Status = request.Status.Value;
        if (request.MyRating.HasValue) entry.MyRating = request.MyRating.Value;
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
            // Get group IDs from junction table and legacy GroupId
            var entryGroupIds = await db.WatchEntryGroups
                .Where(weg => weg.WatchEntryId == entry.Id)
                .Select(weg => weg.GroupId)
                .ToListAsync();
            if (entry.GroupId.HasValue && !entryGroupIds.Contains(entry.GroupId.Value))
                entryGroupIds.Add(entry.GroupId.Value);

            var validUserIds = entryGroupIds.Count > 0
                ? await db.GroupMembers
                    .Where(m => entryGroupIds.Contains(m.GroupId))
                    .Select(m => m.UserId)
                    .Distinct()
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
                    existing.Rating = ri.Rating;
                }
                else
                {
                    db.EntryRatings.Add(new EntryRating
                    {
                        WatchEntryId = entry.Id,
                        UserId = ri.UserId,
                        Rating = ri.Rating
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
                existing.Rating = request.Rating.Value;
            }
            else
            {
                db.EntryRatings.Add(new EntryRating
                {
                    WatchEntryId = entry.Id,
                    UserId = userId,
                    Rating = request.Rating.Value
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
        AppDbContext db,
        ILocalizationService localizer)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Ratings)
            .Include(w => w.WatchEntryGroups)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check access - members can rate entries in their groups (via junction table or legacy GroupId)
        var entryGroupIds = entry.WatchEntryGroups.Select(weg => weg.GroupId).ToList();
        if (entry.GroupId.HasValue && !entryGroupIds.Contains(entry.GroupId.Value))
            entryGroupIds.Add(entry.GroupId.Value);

        if (entryGroupIds.Count > 0)
        {
            if (!await db.GroupMembers.AnyAsync(m => entryGroupIds.Contains(m.GroupId) && m.UserId == userId))
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsRate"]));
        }
        else if (entry.UserId != userId)
        {
            return Results.NotFound();
        }

        var rating = request.Rating;
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
        return Results.Ok(new RatingResponse(rating));
    }

    private static async Task<IResult> Delete(
        int id, ClaimsPrincipal user, AppDbContext db, ILocalizationService localizer)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries
            .Include(w => w.Movie)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check delete permission
        if (!await PermissionService.CanDeleteEntry(db, userId, entry))
            return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsDelete"]));

        var movieId = entry.MovieId;
        var posterUrl = entry.Movie.PosterUrl;
        var movie = entry.Movie;

        db.WatchEntries.Remove(entry);
        await db.SaveChangesAsync();

        // Clean up movie and poster if no other entries reference this movie
        var otherEntries = await db.WatchEntries.AnyAsync(w => w.MovieId == movieId);
        if (!otherEntries)
        {
            if (!string.IsNullOrEmpty(posterUrl) && int.TryParse(posterUrl, out var posterId))
            {
                var poster = await db.PosterImages.FindAsync(posterId);
                if (poster != null) db.PosterImages.Remove(poster);
            }

            db.Movies.Remove(movie);
            await db.SaveChangesAsync();
        }

        return Results.NoContent();
    }

    private static async Task<IResult> GetStats(
        ClaimsPrincipal user,
        AppDbContext db,
        ILocalizationService localizer,
        int? groupId = null)
    {
        var userId = GetUserId(user);

        IQueryable<WatchEntry> query;

        if (groupId.HasValue)
        {
            if (!await PermissionService.CanViewGroup(db, userId, groupId.Value))
                return Results.BadRequest(new ErrorResponse(localizer["InsufficientPermissionsStats"]));

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings)
                .ThenInclude(x => x.User)
                .Where(w => w.WatchEntryGroups.Any(weg => weg.GroupId == groupId.Value)
                            || w.GroupId == groupId.Value);
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