using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Infrastructure.Services;

public class AniListService : IAniListService
{
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AniListService> _logger;
    private readonly string _baseUrl;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    public AniListService(
        HttpClient httpClient,
        IDistributedCache cache,
        IConfiguration configuration,
        ILogger<AniListService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
        _baseUrl = configuration["ExternalApis:AniList:BaseUrl"] ?? "https://graphql.anilist.co";
    }

    public async Task<ExternalSearchResponse> SearchAsync(string query, int page = 1, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"anilist:search:{query}:{page}";
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        
        if (!string.IsNullOrEmpty(cached))
        {
            var cachedResult = JsonSerializer.Deserialize<ExternalSearchResponse>(cached);
            if (cachedResult != null)
            {
                return cachedResult;
            }
        }

        try
        {
            var graphqlQuery = @"
                query ($search: String, $page: Int, $perPage: Int) {
                    Page(page: $page, perPage: $perPage) {
                        media(search: $search, type: ANIME) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            description
                            coverImage {
                                large
                                medium
                            }
                            averageScore
                            episodes
                            format
                            startDate {
                                year
                            }
                            genres
                        }
                    }
                }";

            var variables = new
            {
                search = query,
                page = page,
                perPage = 20
            };

            var request = new
            {
                query = graphqlQuery,
                variables = variables
            };

            var content = new StringContent(
                JsonSerializer.Serialize(request),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(_baseUrl, content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var apiResponse = await response.Content.ReadFromJsonAsync<AniListApiResponse>(cancellationToken);

            if (apiResponse?.Data?.Page?.Media == null)
            {
                return new ExternalSearchResponse(new List<ExternalContentResult>(), 0, "anilist");
            }

            var results = apiResponse.Data.Page.Media
                .Select(MapToExternalContent)
                .Where(r => r != null)
                .Cast<ExternalContentResult>()
                .ToList();

            var result = new ExternalSearchResponse(results, results.Count, "anilist");
            
            var serialized = JsonSerializer.Serialize(result);
            await _cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            }, cancellationToken);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching AniList for query: {Query}", query);
            return new ExternalSearchResponse(new List<ExternalContentResult>(), 0, "anilist");
        }
    }

    public async Task<ExternalContentResult?> GetAnimeDetailsAsync(string anilistId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"anilist:anime:{anilistId}";
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        
        if (!string.IsNullOrEmpty(cached))
        {
            return JsonSerializer.Deserialize<ExternalContentResult>(cached);
        }

        try
        {
            var graphqlQuery = @"
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                            native
                        }
                        description
                        coverImage {
                            large
                            medium
                        }
                        averageScore
                        episodes
                        format
                        startDate {
                            year
                        }
                        endDate {
                            year
                        }
                        genres
                        status
                    }
                }";

            var variables = new
            {
                id = int.Parse(anilistId)
            };

            var request = new
            {
                query = graphqlQuery,
                variables = variables
            };

            var content = new StringContent(
                JsonSerializer.Serialize(request),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(_baseUrl, content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var apiResponse = await response.Content.ReadFromJsonAsync<AniListApiDetailsResponse>(cancellationToken);

            if (apiResponse?.Data?.Media == null)
            {
                return null;
            }

            var result = MapToExternalContent(apiResponse.Data.Media);
            
            if (result != null)
            {
                var serialized = JsonSerializer.Serialize(result);
                await _cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheDuration
                }, cancellationToken);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching AniList anime details for ID: {AnilistId}", anilistId);
            return null;
        }
    }

    private ExternalContentResult? MapToExternalContent(AniListApiMedia media)
    {
        if (media.Title == null)
        {
            return null;
        }

        var title = media.Title.English ?? media.Title.Romaji ?? media.Title.Native ?? "Unknown";
        var genres = media.Genres != null && media.Genres.Any()
            ? string.Join(", ", media.Genres)
            : null;

        var rating = media.AverageScore.HasValue ? (double?)(media.AverageScore.Value / 10.0) : null;

        return new ExternalContentResult(
            ExternalId: media.Id.ToString(),
            Source: "anilist",
            Title: title,
            Description: media.Description,
            PosterUrl: media.CoverImage?.Large ?? media.CoverImage?.Medium,
            Year: media.StartDate?.Year,
            Genres: genres,
            Type: ContentType.Anime,
            Rating: rating,
            Episodes: media.Episodes,
            Seasons: null
        );
    }

    private class AniListApiResponse
    {
        [JsonPropertyName("data")]
        public AniListApiData? Data { get; set; }
    }

    private class AniListApiDetailsResponse
    {
        [JsonPropertyName("data")]
        public AniListApiDetailsData? Data { get; set; }
    }

    private class AniListApiData
    {
        [JsonPropertyName("Page")]
        public AniListApiPage? Page { get; set; }
    }

    private class AniListApiDetailsData
    {
        [JsonPropertyName("Media")]
        public AniListApiMedia? Media { get; set; }
    }

    private class AniListApiPage
    {
        [JsonPropertyName("media")]
        public List<AniListApiMedia> Media { get; set; } = new();
    }

    private class AniListApiMedia
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public AniListApiTitle? Title { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("coverImage")]
        public AniListApiCoverImage? CoverImage { get; set; }

        [JsonPropertyName("averageScore")]
        public int? AverageScore { get; set; }

        [JsonPropertyName("episodes")]
        public int? Episodes { get; set; }

        [JsonPropertyName("format")]
        public string? Format { get; set; }

        [JsonPropertyName("startDate")]
        public AniListApiDate? StartDate { get; set; }

        [JsonPropertyName("endDate")]
        public AniListApiDate? EndDate { get; set; }

        [JsonPropertyName("genres")]
        public List<string>? Genres { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }
    }

    private class AniListApiTitle
    {
        [JsonPropertyName("romaji")]
        public string? Romaji { get; set; }

        [JsonPropertyName("english")]
        public string? English { get; set; }

        [JsonPropertyName("native")]
        public string? Native { get; set; }
    }

    private class AniListApiCoverImage
    {
        [JsonPropertyName("large")]
        public string? Large { get; set; }

        [JsonPropertyName("medium")]
        public string? Medium { get; set; }
    }

    private class AniListApiDate
    {
        [JsonPropertyName("year")]
        public int? Year { get; set; }
    }
}
