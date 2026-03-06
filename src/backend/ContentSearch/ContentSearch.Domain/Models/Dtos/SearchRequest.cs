namespace ContentSearch.Domain.Models.Dtos;

public record SearchRequest(
    string Query,
    string? Type = null,
    bool ForceExternal = false
);
