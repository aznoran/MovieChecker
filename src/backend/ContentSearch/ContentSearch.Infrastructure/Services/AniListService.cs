using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using ContentSearch.Domain.Models.Dtos;
using ContentSearch.Domain.Models.Entities;
using ContentSearch.Infrastructure.Data;
using ContentSearch.Infrastructure.Services.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace ContentSearch.Infrastructure.Services;

public partial class AniListService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HybridCache _cache;
    private readonly SearchDbContext _db;

    private const string GraphQlQuery = """
        query ($search: String) {
            Page(perPage: 10) {
                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    title { romaji english native }
                    description
                    seasonYear
                    season
                    format
                    status
                    episodes
                    duration
                    genres
                    tags { name }
                    coverImage { large medium extraLarge }
                    bannerImage
                    averageScore
                    meanScore
                    popularity
                    favourites
                    startDate { year month day }
                    endDate { year month day }
                    source
                    countryOfOrigin
                    isAdult
                    siteUrl
                }
            }
        }
        """;

    public AniListService(IHttpClientFactory httpClientFactory, HybridCache cache, SearchDbContext db)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _db = db;
    }

    public async Task<List<SearchResultDto>> SearchAsync(string query, CancellationToken ct = default)
    {
        var cacheKey = $"anilist:search:{query}";
        return await _cache.GetOrCreateAsync(cacheKey, async cancel =>
        {
            var client = _httpClientFactory.CreateClient("AniList");
            var payload = new
            {
                query = GraphQlQuery,
                variables = new { search = query }
            };

            var response = await client.PostAsJsonAsync("", payload, cancel);
            if (!response.IsSuccessStatusCode)
                return [];

            var json = await response.Content.ReadAsStringAsync(cancel);
            var graphQlResponse = JsonSerializer.Deserialize<AniListGraphQlResponse>(json);
            var mediaItems = graphQlResponse?.Data?.Page?.Media ?? [];

            var dtos = mediaItems.Select(MapToContentDto).ToList();
            await SaveRawContentAsync(dtos);

            return dtos.Select(MapToSearchResult).ToList();
        }, new HybridCacheEntryOptions
        {
            Expiration = TimeSpan.FromMinutes(15),
            LocalCacheExpiration = TimeSpan.FromMinutes(5)
        }, cancellationToken: ct);
    }

    private static AniListContentDto MapToContentDto(AniListMediaResult r)
    {
        var description = r.Description != null ? StripHtml(r.Description) : null;
        var tags = r.Tags?
            .Select(t => t.Name ?? "")
            .Where(t => t != "")
            .ToList();

        return new AniListContentDto(
            AnilistId: r.Id,
            TitleRomaji: r.Title?.Romaji,
            TitleEnglish: r.Title?.English,
            TitleNative: r.Title?.Native,
            Description: description,
            SeasonYear: r.SeasonYear,
            Season: r.Season,
            Format: r.Format,
            Status: r.Status,
            Episodes: r.Episodes,
            Duration: r.Duration,
            Genres: r.Genres,
            Tags: tags,
            CoverImageLarge: r.CoverImage?.Large,
            CoverImageMedium: r.CoverImage?.Medium,
            CoverImageExtraLarge: r.CoverImage?.ExtraLarge,
            BannerImage: r.BannerImage,
            AverageScore: r.AverageScore,
            MeanScore: r.MeanScore,
            Popularity: r.Popularity,
            Favourites: r.Favourites,
            StartDateYear: r.StartDate?.Year,
            StartDateMonth: r.StartDate?.Month,
            StartDateDay: r.StartDate?.Day,
            EndDateYear: r.EndDate?.Year,
            EndDateMonth: r.EndDate?.Month,
            EndDateDay: r.EndDate?.Day,
            Source: r.Source,
            CountryOfOrigin: r.CountryOfOrigin,
            IsAdult: r.IsAdult,
            SiteUrl: r.SiteUrl,
            CachedAt: DateTime.UtcNow
        );
    }

    private static SearchResultDto MapToSearchResult(AniListContentDto dto)
    {
        var title = dto.TitleEnglish ?? dto.TitleRomaji ?? "";

        string? genre = null;
        if (dto.Genres is { Count: > 0 })
            genre = string.Join(", ", dto.Genres);

        return new SearchResultDto(
            ExternalId: dto.AnilistId,
            Title: title,
            Description: dto.Description,
            Year: dto.SeasonYear,
            Genre: genre,
            PosterUrl: dto.CoverImageLarge,
            Provider: "AniList",
            TotalSeasons: null,
            TotalEpisodes: dto.Episodes,
            RuntimeMinutes: dto.Duration,
            SuggestedType: "Anime",
            EnglishTitle: dto.TitleEnglish ?? dto.TitleRomaji
        );
    }

    private static string StripHtml(string html)
    {
        return HtmlTagRegex().Replace(html, "").Trim();
    }

    private async Task SaveRawContentAsync(List<AniListContentDto> dtos)
    {
        try
        {
            foreach (var dto in dtos)
            {
                var existing = await _db.AniListContents
                    .FirstOrDefaultAsync(e => e.AnilistId == dto.AnilistId);

                if (existing != null)
                {
                    existing.TitleRomaji = dto.TitleRomaji;
                    existing.TitleEnglish = dto.TitleEnglish;
                    existing.TitleNative = dto.TitleNative;
                    existing.Description = dto.Description;
                    existing.SeasonYear = dto.SeasonYear;
                    existing.Season = dto.Season;
                    existing.Format = dto.Format;
                    existing.Status = dto.Status;
                    existing.Episodes = dto.Episodes;
                    existing.Duration = dto.Duration;
                    existing.Genres = dto.Genres;
                    existing.Tags = dto.Tags;
                    existing.CoverImageLarge = dto.CoverImageLarge;
                    existing.CoverImageMedium = dto.CoverImageMedium;
                    existing.CoverImageExtraLarge = dto.CoverImageExtraLarge;
                    existing.BannerImage = dto.BannerImage;
                    existing.AverageScore = dto.AverageScore;
                    existing.MeanScore = dto.MeanScore;
                    existing.Popularity = dto.Popularity;
                    existing.Favourites = dto.Favourites;
                    existing.StartDateYear = dto.StartDateYear;
                    existing.StartDateMonth = dto.StartDateMonth;
                    existing.StartDateDay = dto.StartDateDay;
                    existing.EndDateYear = dto.EndDateYear;
                    existing.EndDateMonth = dto.EndDateMonth;
                    existing.EndDateDay = dto.EndDateDay;
                    existing.Source = dto.Source;
                    existing.CountryOfOrigin = dto.CountryOfOrigin;
                    existing.IsAdult = dto.IsAdult;
                    existing.SiteUrl = dto.SiteUrl;
                    existing.CachedAt = DateTime.UtcNow;
                }
                else
                {
                    _db.AniListContents.Add(MapToEntity(dto));
                }
            }

            await _db.SaveChangesAsync();
        }
        catch
        {
            // Non-critical: don't fail search if raw storage fails
        }
    }

    private static AniListContent MapToEntity(AniListContentDto dto) => new()
    {
        AnilistId = dto.AnilistId,
        TitleRomaji = dto.TitleRomaji,
        TitleEnglish = dto.TitleEnglish,
        TitleNative = dto.TitleNative,
        Description = dto.Description,
        SeasonYear = dto.SeasonYear,
        Season = dto.Season,
        Format = dto.Format,
        Status = dto.Status,
        Episodes = dto.Episodes,
        Duration = dto.Duration,
        Genres = dto.Genres,
        Tags = dto.Tags,
        CoverImageLarge = dto.CoverImageLarge,
        CoverImageMedium = dto.CoverImageMedium,
        CoverImageExtraLarge = dto.CoverImageExtraLarge,
        BannerImage = dto.BannerImage,
        AverageScore = dto.AverageScore,
        MeanScore = dto.MeanScore,
        Popularity = dto.Popularity,
        Favourites = dto.Favourites,
        StartDateYear = dto.StartDateYear,
        StartDateMonth = dto.StartDateMonth,
        StartDateDay = dto.StartDateDay,
        EndDateYear = dto.EndDateYear,
        EndDateMonth = dto.EndDateMonth,
        EndDateDay = dto.EndDateDay,
        Source = dto.Source,
        CountryOfOrigin = dto.CountryOfOrigin,
        IsAdult = dto.IsAdult,
        SiteUrl = dto.SiteUrl,
        CachedAt = DateTime.UtcNow
    };

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTagRegex();
}
