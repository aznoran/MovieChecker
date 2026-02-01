using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using MovieChecker.Domain.Models;
using MovieChecker.Infrastructure.Abstractions;
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
                return Results.BadRequest(new { message = localizer["InsufficientPermissionsView"] });

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings).ThenInclude(r => r.User)
                .Where(w => w.GroupId == groupId.Value);
        }
        else
        {
            // Personal entries - find user's personal group or entries with null GroupId (legacy)
            var personalGroup = await db.Groups
                .FirstOrDefaultAsync(g => g.CreatedByUserId == userId && g.GroupType == GroupType.Personal);
            
            if (personalGroup != null)
            {
                query = db.WatchEntries
                    .Include(w => w.Movie)
                    .Include(w => w.Ratings).ThenInclude(r => r.User)
                    .Where(w => w.GroupId == personalGroup.Id || (w.UserId == userId && w.GroupId == null));
            }
            else
            {
                // Legacy: no personal group yet, get entries with null GroupId
                query = db.WatchEntries
                    .Include(w => w.Movie)
                    .Include(w => w.Ratings).ThenInclude(r => r.User)
                    .Where(w => w.UserId == userId && w.GroupId == null);
            }
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
            .FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check access
        if (entry.GroupId.HasValue)
        {
            var isMember = await db.GroupMembers
                .AnyAsync(m => m.GroupId == entry.GroupId.Value && m.UserId == userId);
            if (!isMember)
                return Results.BadRequest(new { message = localizer["InsufficientPermissionsViewEntry"] });
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

        if (!await db.Movies.AnyAsync(m => m.Id == request.MovieId))
            return Results.BadRequest(new { message = localizer["MovieNotFound"] });

        int? targetGroupId = request.GroupId;
        
        // If no group specified, use the user's personal group
        if (!targetGroupId.HasValue)
        {
            var personalGroup = await db.Groups
                .FirstOrDefaultAsync(g => g.CreatedByUserId == userId && g.GroupType == GroupType.Personal);
            
            if (personalGroup != null)
            {
                targetGroupId = personalGroup.Id;
            }
        }

        // Validate group membership if group specified
        if (targetGroupId.HasValue)
        {
            // Check if user can create in this group
            if (!await PermissionService.CanCreateInGroup(db, userId, targetGroupId.Value))
                return Results.BadRequest(new { message = localizer["InsufficientPermissionsCreate"] });

            // Check duplicate within group
            if (await db.WatchEntries.AnyAsync(w => w.MovieId == request.MovieId && w.GroupId == targetGroupId.Value))
                return Results.BadRequest(new { message = localizer["EntryAlreadyExistsGroup"] });
        }
        else
        {
            // Legacy: Check duplicate for personal entries with null GroupId
            if (await db.WatchEntries.AnyAsync(w =>
                    w.MovieId == request.MovieId && w.UserId == userId && w.GroupId == null))
                return Results.BadRequest(new { message = localizer["EntryAlreadyExists"] });
        }

        var entry = new WatchEntry
        {
            MovieId = request.MovieId,
            UserId = userId,
            GroupId = targetGroupId,
            Status = request.Status,
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

        // If creating in a non-personal group, duplicate to personal lists of all viewers
        Dictionary<int, WatchEntry> personalEntries = new();
        var isPersonalGroup = targetGroupId.HasValue && 
            await db.Groups.AnyAsync(g => g.Id == targetGroupId.Value && g.GroupType == GroupType.Personal);
        
        if (targetGroupId.HasValue && !isPersonalGroup && request.Viewers is { Count: > 0 })
        {
            // Get list of user IDs who are chosen as viewers
            var viewerUserIds = request.Viewers.Distinct().ToList();
            
            // Get user settings to check privacy preferences
            var userSettings = await db.UserSettings
                .Where(s => viewerUserIds.Contains(s.UserId))
                .ToDictionaryAsync(s => s.UserId);
            
            // Get personal groups for all viewers
            var viewerPersonalGroups = await db.Groups
                .Where(g => viewerUserIds.Contains(g.CreatedByUserId) && g.GroupType == GroupType.Personal)
                .ToDictionaryAsync(g => g.CreatedByUserId, g => g.Id);
            
            // Get existing personal entries for these users for this movie (in their personal groups or null GroupId)
            var existingPersonalEntries = await db.WatchEntries
                .Where(w => w.MovieId == request.MovieId 
                    && viewerUserIds.Contains(w.UserId) 
                    && (w.GroupId == null || viewerPersonalGroups.Values.Contains(w.GroupId.Value)))
                .Select(w => w.UserId)
                .Distinct()
                .ToListAsync();

            // Create personal entries for viewers who don't have one yet and haven't disabled it
            foreach (var viewerUserId in viewerUserIds)
            {
                // Check if user has disabled auto-add to personal
                var settings = userSettings.GetValueOrDefault(viewerUserId);
                bool preventAutoAdd = false;
                
                if (settings != null)
                {
                    // If the viewer is the creator (current user), check PreventMeAddingToMyPersonal
                    // If the viewer is someone else, check PreventOthersAddingToMyPersonal
                    if (viewerUserId == userId)
                    {
                        preventAutoAdd = settings.PreventMeAddingToMyPersonal;
                    }
                    else
                    {
                        preventAutoAdd = settings.PreventOthersAddingToMyPersonal;
                    }
                }
                
                if (!existingPersonalEntries.Contains(viewerUserId) && !preventAutoAdd)
                {
                    // Get the viewer's personal group ID, or null if they don't have one yet
                    int? viewerPersonalGroupId = viewerPersonalGroups.TryGetValue(viewerUserId, out var groupId) 
                        ? groupId 
                        : null;
                    
                    var personalEntry = new WatchEntry
                    {
                        MovieId = request.MovieId,
                        UserId = viewerUserId,
                        GroupId = viewerPersonalGroupId,
                        Status = request.Status,
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
                    db.WatchEntries.Add(personalEntry);
                    personalEntries[viewerUserId] = personalEntry;
                }
            }
            
            if (personalEntries.Count > 0)
            {
                await db.SaveChangesAsync();
            }
        }

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
                    
                    // Add rating to personal entry if it exists for this user
                    if (personalEntries.TryGetValue(ri.UserId, out var personalEntry))
                    {
                        db.EntryRatings.Add(new EntryRating
                        {
                            WatchEntryId = personalEntry.Id,
                            UserId = ri.UserId,
                            Rating = Math.Clamp(ri.Rating, 1, 10)
                        });
                    }
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
            
            // Add rating to personal entry if it exists for current user
            if (personalEntries.TryGetValue(userId, out var personalEntry))
            {
                db.EntryRatings.Add(new EntryRating
                {
                    WatchEntryId = personalEntry.Id,
                    UserId = userId,
                    Rating = Math.Clamp(request.Rating.Value, 1, 10)
                });
            }
            
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
            return Results.BadRequest(new { message = localizer["InsufficientPermissionsEdit"] });

        if (request.Status.HasValue) entry.Status = request.Status.Value;
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
        AppDbContext db,
        ILocalizationService localizer)
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
                return Results.BadRequest(new { message = localizer["InsufficientPermissionsRate"] });
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

    private static async Task<IResult> Delete(
        int id, ClaimsPrincipal user, AppDbContext db, ILocalizationService localizer)
    {
        var userId = GetUserId(user);
        var entry = await db.WatchEntries.FirstOrDefaultAsync(w => w.Id == id);

        if (entry == null)
            return Results.NotFound();

        // Check delete permission
        if (!await PermissionService.CanDeleteEntry(db, userId, entry))
            return Results.BadRequest(new { message = localizer["InsufficientPermissionsDelete"] });

        db.WatchEntries.Remove(entry);
        await db.SaveChangesAsync();

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
                return Results.BadRequest(new { message = localizer["InsufficientPermissionsStats"] });

            query = db.WatchEntries
                .Include(w => w.Movie)
                .Include(w => w.Ratings)
                .ThenInclude(x => x.User)
                .Where(w => w.GroupId == groupId.Value);
        }
        else
        {
            // Personal entries - find user's personal group or entries with null GroupId (legacy)
            var personalGroup = await db.Groups
                .FirstOrDefaultAsync(g => g.CreatedByUserId == userId && g.GroupType == GroupType.Personal);
            
            if (personalGroup != null)
            {
                query = db.WatchEntries
                    .Include(w => w.Movie)
                    .Include(w => w.Ratings)
                    .ThenInclude(x => x.User)
                    .Where(w => w.GroupId == personalGroup.Id || (w.UserId == userId && w.GroupId == null));
            }
            else
            {
                query = db.WatchEntries
                    .Include(w => w.Movie)
                    .Include(w => w.Ratings)
                    .ThenInclude(x => x.User)
                    .Where(w => w.UserId == userId && w.GroupId == null);
            }
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