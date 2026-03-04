using System.Text.Json;
using ContentSearch.Domain.Models.Dtos;
using ContentSearch.Domain.Models.Entities;
using ContentSearch.Infrastructure.Data;
using ContentSearch.Infrastructure.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Configuration;

namespace ContentSearch.Infrastructure.Services;

public class TmdbService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HybridCache _cache;
    private readonly SearchDbContext _db;
    private readonly string _imageBaseUrl;

    private static readonly Dictionary<int, string> GenreMap = new()
    {
        // Movie genres
        {28, "Action"}, {12, "Adventure"}, {16, "Animation"}, {35, "Comedy"},
        {80, "Crime"}, {99, "Documentary"}, {18, "Drama"}, {10751, "Family"},
        {14, "Fantasy"}, {36, "History"}, {27, "Horror"}, {10402, "Music"},
        {9648, "Mystery"}, {10749, "Romance"}, {878, "Sci-Fi"}, {10770, "TV Movie"},
        {53, "Thriller"}, {10752, "War"}, {37, "Western"},
        // TV genres
        {10759, "Action & Adventure"}, {10762, "Kids"}, {10763, "News"},
        {10764, "Reality"}, {10765, "Sci-Fi & Fantasy"}, {10766, "Soap"},
        {10767, "Talk"}, {10768, "War & Politics"},
    };

    public TmdbService(IHttpClientFactory httpClientFactory, HybridCache cache, SearchDbContext db, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _db = db;
        _imageBaseUrl = config["ExternalApis:Tmdb:ImageBaseUrl"] ?? "https://image.tmdb.org/t/p/w500";
    }

    public async Task<List<SearchResultDto>> SearchAsync(string query, string? type, string language = "en-US", CancellationToken ct = default)
    {
        var cacheKey = $"tmdb:search:{query}:{type ?? "all"}:{language}";
        return await _cache.GetOrCreateAsync(cacheKey, async cancel =>
        {
            var isMovie = type is "Movie" or "Cartoon" or null;
            var isTv = type is "Series" or "Show" or null;
            var needEnglish = !language.StartsWith("en", StringComparison.OrdinalIgnoreCase);

            var tasks = new List<Task<List<TmdbApiResult>>>();

            // Localized results
            if (isMovie) tasks.Add(FetchFromTmdb("search/movie", query, language, cancel));
            if (isTv) tasks.Add(FetchFromTmdb("search/tv", query, language, cancel));

            // English results for cross-provider grouping
            if (needEnglish)
            {
                if (isMovie) tasks.Add(FetchFromTmdb("search/movie", query, "en-US", cancel));
                if (isTv) tasks.Add(FetchFromTmdb("search/tv", query, "en-US", cancel));
            }

            await Task.WhenAll(tasks);

            var taskIndex = 0;
            var results = new List<SearchResultDto>();
            var rawDtos = new List<TmdbContentDto>();

            if (isMovie)
            {
                var movieItems = tasks[taskIndex++].Result;
                var dtos = movieItems.Select(r => MapToContentDto(r, "movie")).ToList();
                results.AddRange(dtos.Select(d => MapToSearchResult(d, "Movie")));
                rawDtos.AddRange(dtos);
            }
            if (isTv)
            {
                var tvItems = tasks[taskIndex++].Result;
                var dtos = tvItems.Select(r => MapToContentDto(r, "tv")).ToList();
                results.AddRange(dtos.Select(d => MapToSearchResult(d, "Series")));
                rawDtos.AddRange(dtos);
            }

            // Merge English results and build English title lookup
            if (needEnglish)
            {
                var englishTitles = new Dictionary<int, string>();
                var localizedIds = new HashSet<int>(results.Select(r => r.ExternalId));

                if (isMovie)
                {
                    var enMovieItems = tasks[taskIndex++].Result;
                    foreach (var item in enMovieItems)
                    {
                        if (!string.IsNullOrEmpty(item.Title))
                            englishTitles[item.Id] = item.Title;
                    }
                    // Merge English-only movies not present in localized results
                    foreach (var item in enMovieItems.Where(i => !localizedIds.Contains(i.Id)))
                    {
                        var dto = MapToContentDto(item, "movie");
                        results.Add(MapToSearchResult(dto, "Movie") with { EnglishTitle = item.Title });
                        rawDtos.Add(dto);
                        localizedIds.Add(item.Id);
                    }
                }
                if (isTv)
                {
                    var enTvItems = tasks[taskIndex++].Result;
                    foreach (var item in enTvItems)
                    {
                        if (!string.IsNullOrEmpty(item.Name))
                            englishTitles[item.Id] = item.Name;
                    }
                    // Merge English-only TV results not present in localized results
                    foreach (var item in enTvItems.Where(i => !localizedIds.Contains(i.Id)))
                    {
                        var dto = MapToContentDto(item, "tv");
                        results.Add(MapToSearchResult(dto, "Series") with { EnglishTitle = item.Name });
                        rawDtos.Add(dto);
                        localizedIds.Add(item.Id);
                    }
                }

                // Set EnglishTitle on localized results found in English search
                results = results.Select(r =>
                    r.EnglishTitle == null && englishTitles.TryGetValue(r.ExternalId, out var enTitle)
                        ? r with { EnglishTitle = enTitle }
                        : r
                ).ToList();

                // Fetch English titles by ID for results the English search didn't cover
                var missingEnglish = results
                    .Where(r => r.EnglishTitle == null)
                    .Select(r => (r.ExternalId, r.SuggestedType is "Movie" or "Cartoon" ? "movie" : "tv"))
                    .ToList();

                if (missingEnglish.Count > 0)
                {
                    var fetchedTitles = await FetchEnglishTitlesByIdAsync(missingEnglish, cancel);
                    results = results.Select(r =>
                        r.EnglishTitle == null && fetchedTitles.TryGetValue(r.ExternalId, out var title)
                            ? r with { EnglishTitle = title }
                            : r
                    ).ToList();
                }
            }

            await SaveRawContentAsync(rawDtos);

            return results
                .OrderByDescending(r => r.Year ?? 0)
                .ToList();
        }, new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(15),
            LocalCacheExpiration = TimeSpan.FromMinutes(5)
        }, cancellationToken: ct);
    }

    private async Task<List<TmdbApiResult>> FetchFromTmdb(string endpoint, string query, string language, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("Tmdb");
        var response = await client.GetAsync(
            $"{endpoint}?query={Uri.EscapeDataString(query)}&language={Uri.EscapeDataString(language)}&page=1", ct);

        if (!response.IsSuccessStatusCode)
            return [];

        var json = await response.Content.ReadAsStringAsync(ct);
        var searchResponse = JsonSerializer.Deserialize<TmdbSearchResponse>(json);

        return searchResponse?.Results?.Take(20).ToList() ?? [];
    }

    private static TmdbContentDto MapToContentDto(TmdbApiResult r, string mediaType)
    {
        var isMovie = mediaType == "movie";
        return new TmdbContentDto(
            TmdbId: r.Id,
            MediaType: mediaType,
            Title: (isMovie ? r.Title : r.Name) ?? "",
            OriginalTitle: isMovie ? r.OriginalTitle : r.OriginalName,
            OriginalLanguage: r.OriginalLanguage,
            Overview: r.Overview,
            ReleaseDate: isMovie ? r.ReleaseDate : r.FirstAirDate,
            Popularity: r.Popularity,
            VoteAverage: r.VoteAverage,
            VoteCount: r.VoteCount,
            Adult: r.Adult,
            Video: r.Video,
            BackdropPath: r.BackdropPath,
            PosterPath: r.PosterPath,
            GenreIds: r.GenreIds,
            OriginCountry: r.OriginCountry,
            CachedAt: DateTime.UtcNow
        );
    }

    private SearchResultDto MapToSearchResult(TmdbContentDto dto, string suggestedType)
    {
        int? year = null;
        if (!string.IsNullOrEmpty(dto.ReleaseDate) && dto.ReleaseDate.Length >= 4
            && int.TryParse(dto.ReleaseDate[..4], out var y))
            year = y;

        string? genre = null;
        if (dto.GenreIds is { Count: > 0 })
        {
            var genres = dto.GenreIds
                .Where(gid => GenreMap.ContainsKey(gid))
                .Select(gid => GenreMap[gid])
                .ToList();
            if (genres.Count > 0)
                genre = string.Join(", ", genres);
        }

        string? posterUrl = null;
        if (!string.IsNullOrEmpty(dto.PosterPath))
            posterUrl = $"{_imageBaseUrl}{dto.PosterPath}";

        return new SearchResultDto(
            ExternalId: dto.TmdbId,
            Title: dto.Title,
            Description: dto.Overview,
            Year: year,
            Genre: genre,
            PosterUrl: posterUrl,
            Provider: "Tmdb",
            TotalSeasons: null,
            TotalEpisodes: null,
            RuntimeMinutes: null,
            SuggestedType: suggestedType
        );
    }

    private async Task<Dictionary<int, string>> FetchEnglishTitlesByIdAsync(
        List<(int id, string mediaType)> missing, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("Tmdb");
        var result = new Dictionary<int, string>();

        var fetchTasks = missing.Select(async m =>
        {
            var endpoint = m.mediaType == "movie" ? "movie" : "tv";
            var response = await client.GetAsync($"{endpoint}/{m.id}?language=en-US", ct);
            if (!response.IsSuccessStatusCode) return;

            var json = await response.Content.ReadAsStringAsync(ct);
            var detail = JsonSerializer.Deserialize<TmdbApiResult>(json);
            var title = m.mediaType == "movie" ? detail?.Title : detail?.Name;
            if (!string.IsNullOrEmpty(title))
                lock (result) result[m.id] = title;
        });

        await Task.WhenAll(fetchTasks);
        return result;
    }

    private async Task SaveRawContentAsync(List<TmdbContentDto> dtos)
    {
        try
        {
            foreach (var dto in dtos)
            {
                var existing = await _db.TmdbContents
                    .FirstOrDefaultAsync(e => e.TmdbId == dto.TmdbId && e.MediaType == dto.MediaType);

                if (existing != null)
                {
                    existing.Title = dto.Title;
                    existing.OriginalTitle = dto.OriginalTitle;
                    existing.OriginalLanguage = dto.OriginalLanguage;
                    existing.Overview = dto.Overview;
                    existing.ReleaseDate = dto.ReleaseDate;
                    existing.Popularity = dto.Popularity;
                    existing.VoteAverage = dto.VoteAverage;
                    existing.VoteCount = dto.VoteCount;
                    existing.Adult = dto.Adult;
                    existing.Video = dto.Video;
                    existing.BackdropPath = dto.BackdropPath;
                    existing.PosterPath = dto.PosterPath;
                    existing.GenreIds = dto.GenreIds;
                    existing.OriginCountry = dto.OriginCountry;
                    existing.CachedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.TmdbContents.Add(MapToEntity(dto));
                }
            }

            await _db.SaveChangesAsync();
        }
        catch
        {
            // Non-critical: don't fail search if raw storage fails
        }
    }

    private static TmdbContent MapToEntity(TmdbContentDto dto) => new()
    {
        TmdbId = dto.TmdbId,
        MediaType = dto.MediaType,
        Title = dto.Title,
        OriginalTitle = dto.OriginalTitle,
        OriginalLanguage = dto.OriginalLanguage,
        Overview = dto.Overview,
        ReleaseDate = dto.ReleaseDate,
        Popularity = dto.Popularity,
        VoteAverage = dto.VoteAverage,
        VoteCount = dto.VoteCount,
        Adult = dto.Adult,
        Video = dto.Video,
        BackdropPath = dto.BackdropPath,
        PosterPath = dto.PosterPath,
        GenreIds = dto.GenreIds,
        OriginCountry = dto.OriginCountry,
        CachedAt = DateTime.UtcNow
    };
}
