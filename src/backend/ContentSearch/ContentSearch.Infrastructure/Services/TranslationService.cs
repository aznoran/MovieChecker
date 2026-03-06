using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ContentSearch.Domain.Models.Dtos;
using Microsoft.Extensions.Logging;

namespace ContentSearch.Infrastructure.Services;

public record TranslationResult(
    List<TranslatedResultDto> Results,
    int CharactersSent,
    bool Skipped);

public class TranslationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TranslationService> _logger;
    private readonly LanguageDetectionService _langDetection;

    public TranslationService(
        IHttpClientFactory httpClientFactory,
        ILogger<TranslationService> logger,
        LanguageDetectionService langDetection)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _langDetection = langDetection;
    }

    public async Task<TranslationResult> TranslateResultsAsync(
        List<SearchResultDto> results, string targetLang,
        HashSet<(int externalId, string provider)>? forceSet, CancellationToken ct)
    {
        var normalizedTarget = targetLang.ToUpperInvariant().Split('-')[0];

        // Per-text language detection: only send texts that need translation
        var textsToTranslate = new List<string>();
        // Map: index in textsToTranslate -> (resultIndex, isDescription)
        var translateMap = new List<(int resultIndex, bool isDescription)>();
        // Track which result indices have texts queued for translation
        var translatedIndices = new HashSet<int>();

        // Pre-fill output with originals
        var titles = results.Select(r => r.Title).ToArray();
        var descriptions = results.Select(r => r.Description).ToArray();

        for (var i = 0; i < results.Count; i++)
        {
            var result = results[i];
            var isForced = forceSet?.Contains((result.ExternalId, result.Provider)) == true;

            // Determine if the entry as a whole is already in the target language.
            // Use the longest available text (description > title) for most reliable detection.
            // If description is in target language, the title is likely the official localized name
            // (even if it looks like a foreign proper noun, e.g. "Steins;Gate" with Russian description).
            var entryInTarget = false;
            if (!isForced)
            {
                var bestText = !string.IsNullOrEmpty(result.Description) && result.Description.Length >= 10
                    ? result.Description
                    : result.Title;
                entryInTarget = _langDetection.IsTextInLanguage(bestText, normalizedTarget);
            }

            if (!entryInTarget)
            {
                translateMap.Add((i, false));
                textsToTranslate.Add(result.Title);
                translatedIndices.Add(i);

                if (!string.IsNullOrEmpty(result.Description))
                {
                    translateMap.Add((i, true));
                    textsToTranslate.Add(result.Description);
                }
            }
        }

        var charactersSent = textsToTranslate.Sum(t => t.Length);
        var skipped = textsToTranslate.Count == 0;

        if (skipped)
        {
            _logger.LogInformation("Skipping translation: all texts already in target language {TargetLang}", targetLang);
        }
        else
        {
            _logger.LogInformation("Translating {Count} texts ({Chars} chars) to {TargetLang}, skipped {Skipped} already in target",
                textsToTranslate.Count, charactersSent, targetLang,
                results.Count * 2 - textsToTranslate.Count);

            try
            {
                var translated = await TranslateBatchAsync(textsToTranslate, targetLang, ct);

                for (var j = 0; j < translateMap.Count; j++)
                {
                    var (resultIndex, isDescription) = translateMap[j];
                    var translatedText = translated[j];
                    if (translatedText == null) continue;

                    if (isDescription)
                        descriptions[resultIndex] = translatedText;
                    else
                        titles[resultIndex] = translatedText;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DeepL batch translation failed, returning original texts");
            }
        }

        var output = results.Select((r, i) => new TranslatedResultDto(
            ExternalId: r.ExternalId,
            Provider: r.Provider,
            Title: titles[i],
            Description: descriptions[i],
            IsTranslated: translatedIndices.Contains(i)
        )).ToList();

        return new TranslationResult(output, CharactersSent: charactersSent, Skipped: skipped);
    }

    private async Task<string?[]> TranslateBatchAsync(List<string> texts, string targetLang, CancellationToken ct)
    {
        if (texts.Count == 0)
            return [];

        var client = _httpClientFactory.CreateClient("Translation");

        var request = new DeepLRequest
        {
            Text = texts,
            TargetLang = targetLang.ToUpperInvariant()
            // source_lang omitted — DeepL will auto-detect from any language
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
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? SourceLang { get; set; }

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
