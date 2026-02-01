import { ContentType, WatchStatus, Emotion, EmotionEmojis } from "@/types";
import type { Locale } from "./index";
import { t } from "./index";

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
