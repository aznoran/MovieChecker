"use client";

import { useState } from "react";
import { useLocale } from "@/context/locale-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

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

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function GenreMultiSelect({ value, onChange }: Props) {
  const { t } = useLocale();
  const [customInput, setCustomInput] = useState("");

  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const presetGenres = GENRE_KEYS.map((key) => t(key));

  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre).join(", "));
    } else {
      onChange([...selected, genre].join(", "));
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || selected.includes(trimmed)) return;
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
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((genre) => (
            <Badge key={genre} variant="secondary" className="gap-1 pr-1">
              {genre}
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
        {presetGenres
          .filter((g) => !selected.includes(g))
          .map((genre) => (
            <Button
              key={genre}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleGenre(genre)}
            >
              {genre}
            </Button>
          ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("genrePlaceholder")}
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
