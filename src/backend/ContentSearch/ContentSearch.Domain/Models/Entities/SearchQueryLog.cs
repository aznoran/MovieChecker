namespace ContentSearch.Domain.Models.Entities;

public class SearchQueryLog
{
    public long Id { get; set; }
    public string Query { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty; // "search" or "translate"
    public string? TargetLanguage { get; set; }
    public int? ResultCount { get; set; }
    public int CharactersSent { get; set; }
    public bool TranslationSkipped { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
