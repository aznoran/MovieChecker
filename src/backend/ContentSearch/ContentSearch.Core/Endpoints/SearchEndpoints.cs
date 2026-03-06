using ContentSearch.Domain.Models.Dtos;
using ContentSearch.Domain.Models.Entities;
using ContentSearch.Domain.Models.Enums;
using ContentSearch.Infrastructure.Data;
using ContentSearch.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace ContentSearch.Core.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/search");

        group.MapGet("/", Search)
            .Produces<List<SearchResultDto>>(StatusCodes.Status200OK)
            .WithSummary("Search for content")
            .WithDescription("Searches TMDB and AniList for movies, series, and anime");

        group.MapPost("/translate", Translate)
            .Produces<List<TranslatedResultDto>>(StatusCodes.Status200OK)
            .WithSummary("Translate search results")
            .WithDescription("Translates search result titles and descriptions to the target language");
    }

    private static async Task<IResult> Search(
        string q,
        TmdbService tmdbService,
        AniListService aniListService,
        SearchDbContext db,
        IConfiguration config,
        bool forceExternal = false,
        string? language = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Results.Ok(new List<SearchResultDto>());

        var enableLocalSearch = config.GetValue<bool>("ExternalApis:EnableLocalSearchFirst");

        // Phase 2: Local search first
        if (enableLocalSearch && !forceExternal)
        {
            var localResults = await db.ExternalContents
                .Where(e => EF.Functions.ILike(e.Title, $"%{q}%"))
                .OrderByDescending(e => e.CachedAt)
                .Take(10)
                .Select(e => new SearchResultDto(
                    e.ExternalId,
                    e.Title,
                    e.Description,
                    e.Year,
                    e.Genre,
                    e.PosterUrl,
                    e.Provider.ToString(),
                    e.TotalSeasons,
                    e.TotalEpisodes,
                    e.RuntimeMinutes,
                    e.SuggestedType
                ))
                .ToListAsync(ct);

            if (localResults.Count > 0)
            {
                await LogSearchQuery(db, q, "search", language, localResults.Count, ct);
                return Results.Ok(localResults);
            }
        }

        // Always search both TMDB and AniList in parallel
        var tmdbTask = tmdbService.SearchAsync(q, null, language ?? "en-US", ct);
        var aniListTask = aniListService.SearchAsync(q, ct);
        await Task.WhenAll(tmdbTask, aniListTask);

        var results = new List<SearchResultDto>();
        results.AddRange(tmdbTask.Result);
        results.AddRange(aniListTask.Result);

        // Cache results in DB (upsert)
        foreach (var result in results)
        {
            var provider = result.Provider == "AniList" ? ContentProvider.AniList : ContentProvider.Tmdb;
            var existing = await db.ExternalContents
                .FirstOrDefaultAsync(e => e.ExternalId == result.ExternalId && e.Provider == provider, ct);

            if (existing != null)
            {
                existing.Title = result.Title;
                existing.Description = result.Description;
                existing.Year = result.Year;
                existing.Genre = result.Genre;
                existing.PosterUrl = result.PosterUrl;
                existing.TotalSeasons = result.TotalSeasons;
                existing.TotalEpisodes = result.TotalEpisodes;
                existing.RuntimeMinutes = result.RuntimeMinutes;
                existing.SuggestedType = result.SuggestedType;
                existing.CachedAt = DateTime.UtcNow;
            }
            else
            {
                db.ExternalContents.Add(new ExternalContent
                {
                    ExternalId = result.ExternalId,
                    Provider = provider,
                    Title = result.Title,
                    Description = result.Description,
                    Year = result.Year,
                    Genre = result.Genre,
                    PosterUrl = result.PosterUrl,
                    TotalSeasons = result.TotalSeasons,
                    TotalEpisodes = result.TotalEpisodes,
                    RuntimeMinutes = result.RuntimeMinutes,
                    SuggestedType = result.SuggestedType,
                });
            }
        }

        await db.SaveChangesAsync(ct);

        await LogSearchQuery(db, q, "search", language, results.Count, ct);

        return Results.Ok(results);
    }

    private static async Task<IResult> Translate(
        TranslateRequest request,
        TranslationService translationService,
        SearchDbContext db,
        CancellationToken ct)
    {
        if (request.Results.Count == 0 || string.IsNullOrWhiteSpace(request.TargetLanguage))
            return Results.Ok(new List<TranslatedResultDto>());

        HashSet<(int, string)>? forceSet = null;
        if (request.ForceTranslate is { Count: > 0 })
        {
            forceSet = request.ForceTranslate
                .Select(f => (f.ExternalId, f.Provider))
                .ToHashSet();
        }

        var result = await translationService.TranslateResultsAsync(
            request.Results, request.TargetLanguage, forceSet, ct);

        // Log the translation query
        var queryText = string.Join(", ", request.Results.Select(r => r.Title).Take(3));
        db.SearchQueryLogs.Add(new SearchQueryLog
        {
            Query = queryText,
            RequestType = "translate",
            TargetLanguage = request.TargetLanguage,
            ResultCount = request.Results.Count,
            CharactersSent = result.CharactersSent,
            TranslationSkipped = result.Skipped,
        });
        await db.SaveChangesAsync(ct);

        return Results.Ok(result.Results);
    }

    private static async Task LogSearchQuery(
        SearchDbContext db, string query, string requestType, string? language, int resultCount, CancellationToken ct)
    {
        db.SearchQueryLogs.Add(new SearchQueryLog
        {
            Query = query,
            RequestType = requestType,
            TargetLanguage = language,
            ResultCount = resultCount,
        });
        await db.SaveChangesAsync(ct);
    }
}
