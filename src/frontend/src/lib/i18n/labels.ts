import { ContentType, WatchStatus, Emotion, EmotionEmojis } from "@/lib/api";
import type { Locale } from "./index";
import { t } from "./index";
import en from "./en";
import type { TranslationKeys } from "./en";

// Build a mapping from English genre names to translation keys
const genreEnglishToKey: Record<string, TranslationKeys> = {};
const genreKeys: TranslationKeys[] = [
  "genreAction", "genreComedy", "genreDrama", "genreHorror", "genreThriller",
  "genreRomance", "genreSciFi", "genreFantasy", "genreAnimation", "genreDocumentary",
  "genreAdventure", "genreMystery", "genreCrime", "genreFamily", "genreMusical",
];
genreKeys.forEach((key) => {
  genreEnglishToKey[en[key]] = key;
});

export function getContentTypeLabels(locale: Locale): Record<ContentType, string> {
  return {
    [ContentType.Movie]: t("contentMovie", locale),
    [ContentType.Series]: t("contentSeries", locale),
    [ContentType.Anime]: t("contentAnime", locale),
    [ContentType.Cartoon]: t("contentCartoon", locale),
    [ContentType.Show]: t("contentShow", locale),
  };
}

export function getWatchStatusLabels(locale: Locale): Record<WatchStatus, string> {
  return {
    [WatchStatus.Planned]: t("statusPlanned", locale),
    [WatchStatus.Watching]: t("statusWatching", locale),
    [WatchStatus.Completed]: t("statusCompleted", locale),
    [WatchStatus.Dropped]: t("statusDropped", locale),
  };
}

export function getEmotionLabels(locale: Locale): Record<Emotion, string> {
  return {
    [Emotion.Joy]: t("emotionJoy", locale),
    [Emotion.Sadness]: t("emotionSadness", locale),
    [Emotion.Excitement]: t("emotionExcitement", locale),
    [Emotion.Cringe]: t("emotionCringe", locale),
    [Emotion.Confused]: t("emotionConfused", locale),
    [Emotion.Neutral]: t("emotionNeutral", locale),
  };
}

export { EmotionEmojis };

/**
 * Translate a genre string (comma-separated) from stored English names to the current locale.
 * Custom (non-preset) genres are returned as-is.
 */
export function translateGenre(genreStr: string, locale: Locale): string {
  return genreStr
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => {
      const key = genreEnglishToKey[g];
      return key ? t(key, locale) : g;
    })
    .join(", ");
}
