"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { t as translate, type Locale, type TranslationKeys } from "@/lib/i18n";
import { apiClient } from "@/lib/api";

type AnimationPhase = "idle" | "exit" | "enter";

const EXIT_MS = 180;
const ENTER_MS = 280;
const MAX_STAGGER_MS = 200;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys) => string;
  animationPhase: AnimationPhase;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem("locale") as Locale | null;
    return (stored === "en" || stored === "ru") ? stored : "en";
  });
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const enterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const applyLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    try {
      await apiClient.api.authLanguageCreate({ language: newLocale });
    } catch (error) {
      console.error("Failed to set language on backend:", error);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    // Clear any pending timers from a previous click
    clearTimeout(exitTimer.current);
    clearTimeout(enterTimer.current);

    if (prefersReducedMotion()) {
      setAnimationPhase("idle");
      void applyLocale(newLocale);
      return;
    }

    // Phase 1: exit
    setAnimationPhase("exit");

    exitTimer.current = setTimeout(() => {
      // Phase 2: swap locale, start enter
      void applyLocale(newLocale);
      setAnimationPhase("enter");

      enterTimer.current = setTimeout(() => {
        // Phase 3: done
        setAnimationPhase("idle");
      }, ENTER_MS + MAX_STAGGER_MS);
    }, EXIT_MS + MAX_STAGGER_MS);
  }, [applyLocale]);

  const t = useCallback(
    (key: TranslationKeys) => translate(key, locale),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, animationPhase }}>
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
