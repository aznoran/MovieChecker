using MovieChecker.Domain.Models.Dtos;

namespace MovieChecker.Infrastructure.Abstractions;

public interface IAniListService
{
    Task<ExternalSearchResponse> SearchAsync(string query, int page = 1, CancellationToken cancellationToken = default);
    Task<ExternalContentResult?> GetAnimeDetailsAsync(string anilistId, CancellationToken cancellationToken = default);
}
