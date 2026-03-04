namespace ContentSearch.Domain.Models.Dtos;

public record TranslatedResultDto(
    int ExternalId,
    string Provider,
    string Title,
    string? Description
);

public record TranslateRequest(
    List<SearchResultDto> Results,
    string TargetLanguage
);
