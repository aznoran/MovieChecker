import en from "./en";
import ru from "./ru";
import type { TranslationKeys } from "./en";

export type Locale = "en" | "ru";

const translations: Record<Locale, Record<TranslationKeys, string>> = {
  en,
  ru,
};

export function t(key: TranslationKeys, locale: Locale): string {
  return translations[locale][key] ?? key;
}

export type { TranslationKeys };
export { en, ru };
