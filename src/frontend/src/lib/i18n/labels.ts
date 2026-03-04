import { EntryContentType, WatchStatus } from "@/lib/api/generated";
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
  "genreHistory", "genreMusic", "genreWar", "genreWestern",
  "genreSupernatural", "genrePsychological", "genreSliceOfLife", "genreSports",
  "genreMecha", "genreMahouShoujo", "genreEcchi", "genreKids",
  "genreActionAdventure", "genreSciFiFantasy", "genreWarPolitics",
];
genreKeys.forEach((key) => {
  genreEnglishToKey[en[key]] = key;
});

export function getContentTypeLabels(locale: Locale): Record<EntryContentType, string> {
  return {
    [EntryContentType.Movie]: t("contentMovie", locale),
    [EntryContentType.Series]: t("contentSeries", locale),
    [EntryContentType.Anime]: t("contentAnime", locale),
    [EntryContentType.Cartoon]: t("contentCartoon", locale),
    [EntryContentType.Show]: t("contentShow", locale),
  };
}

export function getWatchStatusLabels(locale: Locale): Record<WatchStatus, string> {
  return {
    [WatchStatus.Planned]: t("statusPlanned", locale),
    [WatchStatus.Watching]: t("statusWatching", locale),
    [WatchStatus.Completed]: t("statusCompleted", locale),
    [WatchStatus.Dropped]: t("statusDropped", locale),
    [WatchStatus.Considering]: t("statusConsidering", locale),
  };
}

const suggestedTypeToKey: Record<string, TranslationKeys> = {
  Movie: "contentMovie",
  Series: "contentSeries",
  Anime: "contentAnime",
  Cartoon: "contentCartoon",
  Show: "contentShow",
};

export function translateSuggestedType(suggestedType: string, locale: Locale): string {
  const key = suggestedTypeToKey[suggestedType];
  return key ? t(key, locale) : suggestedType;
}

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
