using System.Globalization;
using Lingua;
using Microsoft.Extensions.Logging;

namespace ContentSearch.Infrastructure.Services;

public class LanguageDetectionService
{
    private readonly LanguageDetector _detector;
    private readonly ILogger<LanguageDetectionService> _logger;

    private static readonly Dictionary<Language, string> LanguageToDeepLCode = new()
    {
        [Language.English] = "EN",
        [Language.Russian] = "RU",
        [Language.Ukrainian] = "UK",
        [Language.German] = "DE",
        [Language.French] = "FR",
        [Language.Spanish] = "ES",
        [Language.Italian] = "IT",
        [Language.Japanese] = "JA",
        [Language.Korean] = "KO",
        [Language.Chinese] = "ZH",
        [Language.Portuguese] = "PT",
        [Language.Dutch] = "NL",
        [Language.Polish] = "PL",
        [Language.Turkish] = "TR",
        [Language.Arabic] = "AR",
        [Language.Czech] = "CS",
        [Language.Danish] = "DA",
        [Language.Finnish] = "FI",
        [Language.Greek] = "EL",
        [Language.Hungarian] = "HU",
        [Language.Indonesian] = "ID",
        [Language.Bokmal] = "NB",
        [Language.Romanian] = "RO",
        [Language.Slovak] = "SK",
        [Language.Swedish] = "SV",
        [Language.Bulgarian] = "BG",
        [Language.Estonian] = "ET",
        [Language.Latvian] = "LV",
        [Language.Lithuanian] = "LT",
        [Language.Slovene] = "SL",
    };

    // Script → DeepL codes that use this script
    private static readonly Dictionary<UnicodeCategory, HashSet<string>> ScriptToLanguages = new()
    {
        // Cyrillic letters fall under UppercaseLetter/LowercaseLetter but we check the range directly
    };

    // Cyrillic-using languages
    private static readonly HashSet<string> CyrillicLanguages = ["RU", "UK", "BG"];
    // CJK-using languages
    private static readonly HashSet<string> CjkLanguages = ["ZH", "JA", "KO"];
    // Arabic-script languages
    private static readonly HashSet<string> ArabicLanguages = ["AR"];
    // Greek-script languages
    private static readonly HashSet<string> GreekLanguages = ["EL"];

    public LanguageDetectionService(ILogger<LanguageDetectionService> logger)
    {
        _logger = logger;
        _detector = LanguageDetectorBuilder
            .FromLanguages(LanguageToDeepLCode.Keys.ToArray())
            .WithLowAccuracyMode()
            .WithPreloadedLanguageModels()
            .Build();
        _logger.LogInformation("Lingua language detector initialized with {Count} languages", LanguageToDeepLCode.Count);
    }

    public string? DetectDeepLLanguage(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;

        var detected = _detector.DetectLanguageOf(text);
        if (detected == Language.Unknown)
            return null;

        return LanguageToDeepLCode.GetValueOrDefault(detected);
    }

    /// <summary>
    /// Checks if a single text is already in the target language (DeepL code, e.g. "EN", "RU").
    /// Uses fast Unicode script detection first, then falls back to Lingua for Latin-script languages.
    /// </summary>
    public bool IsTextInLanguage(string text, string normalizedTargetCode)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length < 3)
            return false;

        // Fast path: detect dominant script from Unicode character ranges
        var scriptMatch = DetectByScript(text, normalizedTargetCode);
        if (scriptMatch.HasValue)
            return scriptMatch.Value;

        // Slow path: use Lingua for Latin-script and ambiguous texts
        var detected = DetectDeepLLanguage(text);
        return detected != null && detected == normalizedTargetCode;
    }

    /// <summary>
    /// Fast script-based detection. Returns:
    /// - true if text's script matches the target language's script family
    /// - false if text's script clearly belongs to a DIFFERENT script family
    /// - null if script is Latin or ambiguous (needs Lingua)
    /// </summary>
    private static bool? DetectByScript(string text, string targetCode)
    {
        int cyrillic = 0, latin = 0, cjk = 0, arabic = 0, greek = 0, other = 0;

        foreach (var ch in text)
        {
            if (char.IsWhiteSpace(ch) || char.IsDigit(ch) || char.IsPunctuation(ch) || char.IsSymbol(ch))
                continue;

            if (ch is >= '\u0400' and <= '\u04FF' or >= '\u0500' and <= '\u052F')
                cyrillic++;
            else if (ch is >= '\u0041' and <= '\u007A' or >= '\u00C0' and <= '\u024F')
                latin++;
            else if (ch is >= '\u4E00' and <= '\u9FFF' or >= '\u3040' and <= '\u30FF' or >= '\uAC00' and <= '\uD7AF')
                cjk++;
            else if (ch is >= '\u0600' and <= '\u06FF')
                arabic++;
            else if (ch is >= '\u0370' and <= '\u03FF')
                greek++;
            else
                other++;
        }

        var total = cyrillic + latin + cjk + arabic + greek + other;
        if (total == 0)
            return null;

        const double threshold = 0.6;

        if ((double)cyrillic / total >= threshold)
            return CyrillicLanguages.Contains(targetCode);

        if ((double)cjk / total >= threshold)
            return CjkLanguages.Contains(targetCode);

        if ((double)arabic / total >= threshold)
            return ArabicLanguages.Contains(targetCode);

        if ((double)greek / total >= threshold)
            return GreekLanguages.Contains(targetCode);

        // Latin script — ambiguous, need Lingua to distinguish EN/DE/FR/ES etc.
        if ((double)latin / total >= threshold)
        {
            // If target is non-Latin script language, text is definitely NOT in target
            if (CyrillicLanguages.Contains(targetCode) || CjkLanguages.Contains(targetCode) ||
                ArabicLanguages.Contains(targetCode) || GreekLanguages.Contains(targetCode))
                return false;

            return null; // Need Lingua to distinguish between Latin-script languages
        }

        return null;
    }
}
