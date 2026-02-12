using MovieChecker.Domain.Models.Dtos;

namespace MovieChecker.Infrastructure.Abstractions;

public interface ITmdbService
{
    Task<ExternalSearchResponse> SearchAsync(string query, int page = 1, CancellationToken cancellationToken = default);
    Task<ExternalContentResult?> GetMovieDetailsAsync(string tmdbId, CancellationToken cancellationToken = default);
    Task<ExternalContentResult?> GetTvDetailsAsync(string tmdbId, CancellationToken cancellationToken = default);
}
