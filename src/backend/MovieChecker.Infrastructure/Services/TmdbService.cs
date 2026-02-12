using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MovieChecker.Domain.Models.Dtos;
using MovieChecker.Domain.Models.Enums;
using MovieChecker.Infrastructure.Abstractions;

namespace MovieChecker.Infrastructure.Services;

public class TmdbService : ITmdbService
{
    private readonly HttpClient _httpClient;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TmdbService> _logger;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly string _imageBaseUrl;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

    public TmdbService(
        HttpClient httpClient,
        IDistributedCache cache,
        IConfiguration configuration,
        ILogger<TmdbService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
        _apiKey = configuration["ExternalApis:Tmdb:ApiKey"] ?? string.Empty;
        _baseUrl = configuration["ExternalApis:Tmdb:BaseUrl"] ?? "https://api.themoviedb.org/3";
        _imageBaseUrl = configuration["ExternalApis:Tmdb:ImageBaseUrl"] ?? "https://image.tmdb.org/t/p";
        
        if (string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("TMDB API key is not configured");
        }
    }

    public async Task<ExternalSearchResponse> SearchAsync(string query, int page = 1, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return new ExternalSearchResponse(new List<ExternalContentResult>(), 0, "tmdb");
        }

        var cacheKey = $"tmdb:search:{query}:{page}";
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
            var url = $"{_baseUrl}/search/multi?api_key={_apiKey}&query={Uri.EscapeDataString(query)}&page={page}&language=en-US";
            var response = await _httpClient.GetFromJsonAsync<TmdbApiSearchResponse>(url, cancellationToken);

            if (response == null)
            {
                return new ExternalSearchResponse(new List<ExternalContentResult>(), 0, "tmdb");
            }

            var results = response.Results
                .Where(r => r.MediaType == "movie" || r.MediaType == "tv")
                .Select(MapToExternalContent)
                .Where(r => r != null)
                .Cast<ExternalContentResult>()
                .ToList();

            var result = new ExternalSearchResponse(results, response.TotalResults, "tmdb");
            
            var serialized = JsonSerializer.Serialize(result);
            await _cache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            }, cancellationToken);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TMDB for query: {Query}", query);
            return new ExternalSearchResponse(new List<ExternalContentResult>(), 0, "tmdb");
        }
    }

    public async Task<ExternalContentResult?> GetMovieDetailsAsync(string tmdbId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return null;
        }

        var cacheKey = $"tmdb:movie:{tmdbId}";
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        
        if (!string.IsNullOrEmpty(cached))
        {
            return JsonSerializer.Deserialize<ExternalContentResult>(cached);
        }

        try
        {
            var url = $"{_baseUrl}/movie/{tmdbId}?api_key={_apiKey}&language=en-US";
            var response = await _httpClient.GetFromJsonAsync<TmdbApiMovieDetails>(url, cancellationToken);

            if (response == null)
            {
                return null;
            }

            var result = MapMovieToExternalContent(response);
            
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
            _logger.LogError(ex, "Error fetching TMDB movie details for ID: {TmdbId}", tmdbId);
            return null;
        }
    }

    public async Task<ExternalContentResult?> GetTvDetailsAsync(string tmdbId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            return null;
        }

        var cacheKey = $"tmdb:tv:{tmdbId}";
        var cached = await _cache.GetStringAsync(cacheKey, cancellationToken);
        
        if (!string.IsNullOrEmpty(cached))
        {
            return JsonSerializer.Deserialize<ExternalContentResult>(cached);
        }

        try
        {
            var url = $"{_baseUrl}/tv/{tmdbId}?api_key={_apiKey}&language=en-US";
            var response = await _httpClient.GetFromJsonAsync<TmdbApiTvDetails>(url, cancellationToken);

            if (response == null)
            {
                return null;
            }

            var result = MapTvToExternalContent(response);
            
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
            _logger.LogError(ex, "Error fetching TMDB TV details for ID: {TmdbId}", tmdbId);
            return null;
        }
    }

    private ExternalContentResult? MapToExternalContent(TmdbApiSearchResult result)
    {
        if (string.IsNullOrWhiteSpace(result.Title) && string.IsNullOrWhiteSpace(result.Name))
        {
            return null;
        }

        var title = result.MediaType == "movie" ? result.Title : result.Name;
        var releaseDate = result.MediaType == "movie" ? result.ReleaseDate : result.FirstAirDate;
        var year = ParseYear(releaseDate);
        
        ContentType type = result.MediaType == "movie" ? ContentType.Movie : ContentType.Series;
        
        return new ExternalContentResult(
            ExternalId: result.Id.ToString(),
            Source: "tmdb",
            Title: title ?? "Unknown",
            Description: result.Overview,
            PosterUrl: string.IsNullOrEmpty(result.PosterPath) ? null : $"{_imageBaseUrl}/w500{result.PosterPath}",
            Year: year,
            Genres: null,
            Type: type,
            Rating: result.VoteAverage,
            Episodes: null,
            Seasons: null
        );
    }

    private ExternalContentResult? MapMovieToExternalContent(TmdbApiMovieDetails details)
    {
        if (string.IsNullOrWhiteSpace(details.Title))
        {
            return null;
        }

        var year = ParseYear(details.ReleaseDate);
        var genres = details.Genres != null && details.Genres.Any() 
            ? string.Join(", ", details.Genres.Select(g => g.Name))
            : null;

        return new ExternalContentResult(
            ExternalId: details.Id.ToString(),
            Source: "tmdb",
            Title: details.Title,
            Description: details.Overview,
            PosterUrl: string.IsNullOrEmpty(details.PosterPath) ? null : $"{_imageBaseUrl}/w500{details.PosterPath}",
            Year: year,
            Genres: genres,
            Type: ContentType.Movie,
            Rating: details.VoteAverage,
            Episodes: null,
            Seasons: null
        );
    }

    private ExternalContentResult? MapTvToExternalContent(TmdbApiTvDetails details)
    {
        if (string.IsNullOrWhiteSpace(details.Name))
        {
            return null;
        }

        var year = ParseYear(details.FirstAirDate);
        var genres = details.Genres != null && details.Genres.Any() 
            ? string.Join(", ", details.Genres.Select(g => g.Name))
            : null;

        return new ExternalContentResult(
            ExternalId: details.Id.ToString(),
            Source: "tmdb",
            Title: details.Name,
            Description: details.Overview,
            PosterUrl: string.IsNullOrEmpty(details.PosterPath) ? null : $"{_imageBaseUrl}/w500{details.PosterPath}",
            Year: year,
            Genres: genres,
            Type: ContentType.Series,
            Rating: details.VoteAverage,
            Episodes: details.NumberOfEpisodes,
            Seasons: details.NumberOfSeasons
        );
    }

    private static int? ParseYear(string? dateString)
    {
        if (string.IsNullOrWhiteSpace(dateString) || dateString.Length < 4)
        {
            return null;
        }

        if (int.TryParse(dateString.Substring(0, 4), out var year))
        {
            return year;
        }

        return null;
    }

    private class TmdbApiSearchResponse
    {
        [JsonPropertyName("page")]
        public int Page { get; set; }

        [JsonPropertyName("results")]
        public List<TmdbApiSearchResult> Results { get; set; } = new();

        [JsonPropertyName("total_pages")]
        public int TotalPages { get; set; }

        [JsonPropertyName("total_results")]
        public int TotalResults { get; set; }
    }

    private class TmdbApiSearchResult
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("overview")]
        public string? Overview { get; set; }

        [JsonPropertyName("poster_path")]
        public string? PosterPath { get; set; }

        [JsonPropertyName("backdrop_path")]
        public string? BackdropPath { get; set; }

        [JsonPropertyName("release_date")]
        public string? ReleaseDate { get; set; }

        [JsonPropertyName("first_air_date")]
        public string? FirstAirDate { get; set; }

        [JsonPropertyName("vote_average")]
        public double VoteAverage { get; set; }

        [JsonPropertyName("vote_count")]
        public int VoteCount { get; set; }

        [JsonPropertyName("media_type")]
        public string MediaType { get; set; } = string.Empty;

        [JsonPropertyName("genre_ids")]
        public List<int> GenreIds { get; set; } = new();
    }

    private class TmdbApiMovieDetails
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("overview")]
        public string? Overview { get; set; }

        [JsonPropertyName("poster_path")]
        public string? PosterPath { get; set; }

        [JsonPropertyName("backdrop_path")]
        public string? BackdropPath { get; set; }

        [JsonPropertyName("release_date")]
        public string? ReleaseDate { get; set; }

        [JsonPropertyName("vote_average")]
        public double VoteAverage { get; set; }

        [JsonPropertyName("vote_count")]
        public int VoteCount { get; set; }

        [JsonPropertyName("genres")]
        public List<TmdbApiGenre>? Genres { get; set; }

        [JsonPropertyName("runtime")]
        public int? Runtime { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("tagline")]
        public string? Tagline { get; set; }
    }

    private class TmdbApiTvDetails
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("overview")]
        public string? Overview { get; set; }

        [JsonPropertyName("poster_path")]
        public string? PosterPath { get; set; }

        [JsonPropertyName("backdrop_path")]
        public string? BackdropPath { get; set; }

        [JsonPropertyName("first_air_date")]
        public string? FirstAirDate { get; set; }

        [JsonPropertyName("vote_average")]
        public double VoteAverage { get; set; }

        [JsonPropertyName("vote_count")]
        public int VoteCount { get; set; }

        [JsonPropertyName("genres")]
        public List<TmdbApiGenre>? Genres { get; set; }

        [JsonPropertyName("number_of_seasons")]
        public int? NumberOfSeasons { get; set; }

        [JsonPropertyName("number_of_episodes")]
        public int? NumberOfEpisodes { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("tagline")]
        public string? Tagline { get; set; }
    }

    private class TmdbApiGenre
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }
}
