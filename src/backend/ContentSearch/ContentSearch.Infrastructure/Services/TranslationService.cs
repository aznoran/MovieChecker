using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ContentSearch.Domain.Models.Dtos;
using Microsoft.Extensions.Logging;

namespace ContentSearch.Infrastructure.Services;

public class TranslationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TranslationService> _logger;

    public TranslationService(IHttpClientFactory httpClientFactory, ILogger<TranslationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<List<TranslatedResultDto>> TranslateResultsAsync(
        List<SearchResultDto> results, string targetLang, CancellationToken ct)
    {
        // Build flat list of texts: [title0, desc0, title1, desc1, ...]
        var texts = new List<string>();
        var descriptionIndices = new HashSet<int>();

        foreach (var result in results)
        {
            texts.Add(result.Title);
            if (!string.IsNullOrEmpty(result.Description))
            {
                descriptionIndices.Add(texts.Count);
                texts.Add(result.Description);
            }
        }

        // Translate all texts in one batch call
        string?[] translated;
        try
        {
            translated = await TranslateBatchAsync(texts, targetLang, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DeepL batch translation failed, returning original texts");
            return results.Select(r => new TranslatedResultDto(
                ExternalId: r.ExternalId,
                Provider: r.Provider,
                Title: r.Title,
                Description: r.Description
            )).ToList();
        }

        // Map translated texts back to results
        var output = new List<TranslatedResultDto>();
        var textIndex = 0;

        foreach (var result in results)
        {
            var translatedTitle = translated[textIndex] ?? result.Title;
            textIndex++;

            string? translatedDescription = result.Description;
            if (!string.IsNullOrEmpty(result.Description))
            {
                translatedDescription = translated[textIndex] ?? result.Description;
                textIndex++;
            }

            output.Add(new TranslatedResultDto(
                ExternalId: result.ExternalId,
                Provider: result.Provider,
                Title: translatedTitle,
                Description: translatedDescription
            ));
        }

        return output;
    }

    private async Task<string?[]> TranslateBatchAsync(List<string> texts, string targetLang, CancellationToken ct)
    {
        if (texts.Count == 0)
            return [];

        var client = _httpClientFactory.CreateClient("Translation");

        var request = new DeepLRequest
        {
            Text = texts,
            SourceLang = "EN",
            TargetLang = targetLang.ToUpperInvariant()
        };

        var response = await client.PostAsJsonAsync("/v2/translate", request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("DeepL API returned {StatusCode}: {Body}. Auth header present: {HasAuth}",
                (int)response.StatusCode, errorBody, client.DefaultRequestHeaders.Authorization != null);
            response.EnsureSuccessStatusCode();
        }

        var result = await response.Content.ReadFromJsonAsync<DeepLResponse>(ct);

        return result?.Translations
            .Select(t => t.Text)
            .ToArray() ?? new string?[texts.Count];
    }

    private class DeepLRequest
    {
        [JsonPropertyName("text")]
        public List<string> Text { get; set; } = [];

        [JsonPropertyName("source_lang")]
        public string SourceLang { get; set; } = "";

        [JsonPropertyName("target_lang")]
        public string TargetLang { get; set; } = "";
    }

    private class DeepLResponse
    {
        [JsonPropertyName("translations")]
        public List<DeepLTranslation> Translations { get; set; } = [];
    }

    private class DeepLTranslation
    {
        [JsonPropertyName("detected_source_language")]
        public string? DetectedSourceLanguage { get; set; }

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
