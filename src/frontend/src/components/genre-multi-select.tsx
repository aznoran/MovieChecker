"use client";

import { useState } from "react";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import en from "@/lib/i18n/en";
import type { TranslationKeys } from "@/lib/i18n/en";

const GENRE_KEYS = [
  "genreAction",
  "genreComedy",
  "genreDrama",
  "genreHorror",
  "genreThriller",
  "genreRomance",
  "genreSciFi",
  "genreFantasy",
  "genreAnimation",
  "genreDocumentary",
  "genreAdventure",
  "genreMystery",
  "genreCrime",
  "genreFamily",
  "genreMusical",
] as const;

// English genre names used as storage keys
const GENRE_ENGLISH_NAMES = GENRE_KEYS.map((key) => en[key]);

// Map from English name to translation key for reverse lookup
const englishToKey: Record<string, TranslationKeys> = {};
GENRE_KEYS.forEach((key) => {
  englishToKey[en[key]] = key;
});

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function GenreMultiSelect({ value, onChange }: Props) {
  const { t } = useLocale();
  const [customInput, setCustomInput] = useState("");

  // Selected values are stored in English for preset genres
  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Get display name for a stored genre value
  const getDisplayName = (genre: string): string => {
    const key = englishToKey[genre];
    return key ? t(key) : genre;
  };

  // Check if a stored value is a preset genre
  const isPresetGenre = (genre: string): boolean => {
    return GENRE_ENGLISH_NAMES.includes(genre);
  };

  const toggleGenre = (englishName: string) => {
    if (selected.includes(englishName)) {
      onChange(selected.filter((g) => g !== englishName).join(", "));
    } else {
      onChange([...selected, englishName].join(", "));
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    if (trimmed.length > 50) return;
    onChange([...selected, trimmed].join(", "));
    setCustomInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  return (
    <div className="space-y-6">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((genre) => (
            <Badge key={genre} variant="secondary" className="gap-1 pr-1">
              {getDisplayName(genre)}
              <button
                type="button"
                onClick={() => toggleGenre(genre)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {GENRE_ENGLISH_NAMES
          .filter((g) => !selected.includes(g))
          .map((englishName) => (
            <Button
              key={englishName}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleGenre(englishName)}
            >
              {getDisplayName(englishName)}
            </Button>
          ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("genrePlaceholder")}
          maxLength={50}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 shrink-0"
          onClick={addCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Export for use in stats page and other display contexts
export { englishToKey, GENRE_ENGLISH_NAMES };
