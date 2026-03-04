"use client";

import {useState, useEffect} from "react";
import {useLocale} from "@/context/locale-context";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {X, Plus, ChevronDown, ChevronUp} from "lucide-react";
import {FieldError} from "@/components/ui/field";
import en from "@/lib/i18n/en";
import type {TranslationKeys} from "@/lib/i18n/en";

// Primary genres — always visible
const PRIMARY_GENRE_KEYS = [
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

// Extended genres — behind "show more"
const EXTENDED_GENRE_KEYS = [
    "genreHistory",
    "genreMusic",
    "genreWar",
    "genreWestern",
    "genreKids",
    "genreSupernatural",
    "genrePsychological",
    "genreSliceOfLife",
    "genreSports",
    "genreMecha",
    "genreMahouShoujo",
    "genreEcchi",
] as const;

const ALL_GENRE_KEYS = [...PRIMARY_GENRE_KEYS, ...EXTENDED_GENRE_KEYS] as const;

// English genre names used as storage keys
const GENRE_ENGLISH_NAMES: string[] = ALL_GENRE_KEYS.map((key) => en[key]);
const PRIMARY_ENGLISH_NAMES: string[] = PRIMARY_GENRE_KEYS.map((key) => en[key]);
const EXTENDED_ENGLISH_NAMES: string[] = EXTENDED_GENRE_KEYS.map((key) => en[key]);

// Map from English name to translation key for reverse lookup
const englishToKey: Record<string, TranslationKeys> = {};
ALL_GENRE_KEYS.forEach((key) => {
    englishToKey[en[key]] = key;
});

interface Props {
    value: string;
    onChange: (value: string) => void;
}

export function GenreMultiSelect({value, onChange}: Props) {
    const {t} = useLocale();
    const [customInput, setCustomInput] = useState("");
    const [genreError, setGenreError] = useState("");
    const [showExtended, setShowExtended] = useState(false);

    // Selected values are stored in English for preset genres
    const selected = value
        ? value.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    // Auto-expand once if any extended genre is already selected (e.g. from search autofill)
    useEffect(() => {
        if (selected.some((g) => EXTENDED_ENGLISH_NAMES.includes(g))) {
            setShowExtended(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Get display name for a stored genre value
    const getDisplayName = (genre: string): string => {
        const key = englishToKey[genre];
        return key ? t(key) : genre;
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
        if (trimmed.length > 50) {
            setGenreError(t("genreTooLong"));
            return;
        }
        setGenreError("");
        onChange([...selected, trimmed].join(", "));
        setCustomInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addCustom();
        }
    };

    const visibleGenres = showExtended ? GENRE_ENGLISH_NAMES : PRIMARY_ENGLISH_NAMES;

    return (
        <div className="space-y-6">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((genre) => (
                        <Badge key={genre} variant="secondary" className="gap-1 pr-1">
                            {getDisplayName(genre)}
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => toggleGenre(genre)}
                                className="ml-0.5 h-4 w-4 hover:text-destructive"
                            >
                                <X/>
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-1.5">
                {visibleGenres
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
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setShowExtended((prev) => !prev)}
                >
                    {showExtended ? t("showLessGenres") : t("showMoreGenres")}
                    {showExtended ? <ChevronUp className="ml-1 h-3 w-3"/> : <ChevronDown className="ml-1 h-3 w-3"/>}
                </Button>
            </div>

            <div className="space-y-1">
                <div className="flex gap-2">
                    <Input
                        value={customInput}
                        onChange={(e) => {
                            setCustomInput(e.target.value);
                            setGenreError(e.target.value.trim().length > 50 ? t("genreTooLong") : "");
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={t("genrePlaceholder")}
                        className="h-8 text-sm"
                        aria-invalid={!!genreError}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 shrink-0"
                        onClick={addCustom}
                        disabled={!customInput.trim() || !!genreError}
                    >
                        <Plus className="h-3.5 w-3.5"/>
                    </Button>
                </div>
                {genreError && <FieldError>{genreError}</FieldError>}
            </div>
        </div>
    );
}

// Export for use in stats page and other display contexts
export {englishToKey, GENRE_ENGLISH_NAMES};
