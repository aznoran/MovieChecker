namespace ContentSearch.Domain.Models.Dtos;

public record SearchResultDto(
    int ExternalId,
    string Title,
    string? Description,
    int? Year,
    string? Genre,
    string? PosterUrl,
    string Provider,
    int? TotalSeasons,
    int? TotalEpisodes,
    int? RuntimeMinutes,
    string SuggestedType,
    string? EnglishTitle = null
);
