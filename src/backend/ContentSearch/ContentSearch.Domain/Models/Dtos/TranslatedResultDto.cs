namespace ContentSearch.Domain.Models.Dtos;

public record TranslatedResultDto(
    int ExternalId,
    string Provider,
    string Title,
    string? Description,
    bool IsTranslated
);

public record TranslateRequest(
    List<SearchResultDto> Results,
    string TargetLanguage,
    List<TranslateForceItem>? ForceTranslate = null
);

public record TranslateForceItem(
    int ExternalId,
    string Provider
);
