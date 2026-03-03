"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { t as translate, type Locale, type TranslationKeys } from "@/lib/i18n";
import { apiClient } from "@/lib/api";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("locale") as Locale | null;
    return (stored === "en" || stored === "ru") ? stored : "en";
  });

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    // Call backend to set culture cookie
    try {
      await apiClient.api.authLanguageCreate({ language: newLocale });
    } catch (error) {
      console.error("Failed to set language on backend:", error);
      // Continue with local change even if API call fails
    }
  };

  const t = useCallback(
    (key: TranslationKeys) => translate(key, locale),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
