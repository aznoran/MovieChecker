"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldContent,
    FieldGroup,
    FieldSet,
    FieldLegend,
} from "@/components/ui/field";
import { useLocale } from "@/context/locale-context";
import { EntryContentType } from "@/lib/api/generated";

interface SeriesTrackingSectionProps {
    contentType: EntryContentType;
    currentSeason: string;
    setCurrentSeason: (v: string) => void;
    currentEpisode: string;
    setCurrentEpisode: (v: string) => void;
    totalEpisodes: string;
    setTotalEpisodes: (v: string) => void;
    totalSeasons: string;
    setTotalSeasons: (v: string) => void;
    runtimeMinutes: string;
    setRuntimeMinutes: (v: string) => void;
    hours: string;
    setHours: (v: string) => void;
    minutes: string;
    setMinutes: (v: string) => void;
    seconds: string;
    setSeconds: (v: string) => void;
    handleFieldChange: (name: string, value: string) => void;
    validationErrors: Record<string, string>;
    /** Wrap in FieldSet with legend (used in group mode) */
    wrapped?: boolean;
}

const SERIES_TYPES = new Set<EntryContentType>([
    EntryContentType.Series,
    EntryContentType.Anime,
    EntryContentType.Cartoon,
]);

export function SeriesTrackingSection({
    contentType,
    currentSeason,
    setCurrentSeason,
    currentEpisode,
    setCurrentEpisode,
    totalEpisodes,
    setTotalEpisodes,
    totalSeasons,
    setTotalSeasons,
    runtimeMinutes,
    setRuntimeMinutes,
    hours,
    setHours,
    minutes,
    setMinutes,
    seconds,
    setSeconds,
    handleFieldChange,
    validationErrors,
    wrapped = true,
}: SeriesTrackingSectionProps) {
    const { t } = useLocale();
    const isSeries = SERIES_TYPES.has(contentType);

    // Internal state for runtime hours:minutes display
    const [rtHours, setRtHours] = useState("");
    const [rtMins, setRtMins] = useState("");

    // Sync from parent runtimeMinutes → internal h:m
    useEffect(() => {
        const total = parseInt(runtimeMinutes);
        if (!runtimeMinutes || isNaN(total)) {
            setRtHours("");
            setRtMins("");
            return;
        }
        setRtHours(Math.floor(total / 60).toString());
        const m = total % 60;
        setRtMins(m > 0 ? m.toString() : "");
    }, []); // only on mount

    // Sync internal h:m → parent runtimeMinutes
    const syncRuntime = useCallback((h: string, m: string) => {
        const hours = parseInt(h) || 0;
        const mins = parseInt(m) || 0;
        if (hours === 0 && mins === 0 && !h && !m) {
            setRuntimeMinutes("");
            handleFieldChange("runtimeMinutes", "");
        } else {
            const total = (hours * 60 + mins).toString();
            setRuntimeMinutes(total);
            handleFieldChange("runtimeMinutes", total);
        }
    }, [setRuntimeMinutes, handleFieldChange]);

    // Dynamic description based on content type
    const runtimeDescKey: Record<EntryContentType, string> = {
        [EntryContentType.Movie]: "runtimeDescriptionMovie",
        [EntryContentType.Series]: "runtimeDescriptionSeries",
        [EntryContentType.Anime]: "runtimeDescriptionSeries",
        [EntryContentType.Cartoon]: "runtimeDescriptionCartoon",
        [EntryContentType.Show]: "runtimeDescriptionShow",
    };
    const runtimeDesc = t(runtimeDescKey[contentType] as Parameters<typeof t>[0]);

    const content = (
        <FieldGroup className="gap-4">
            {/* Season & Episode rows — only for series types */}
            {isSeries && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel htmlFor="currentSeason" className="text-sm">
                                {t("season") || "Сезон"}
                            </FieldLabel>
                            <Input
                                id="currentSeason"
                                value={currentSeason}
                                onChange={(e) => {
                                    setCurrentSeason(e.target.value);
                                    handleFieldChange("currentSeason", e.target.value);
                                }}
                                placeholder="1"
                                className="h-8"
                                aria-invalid={!!validationErrors.currentSeason}
                            />
                            {validationErrors.currentSeason && <FieldError className="text-xs">{validationErrors.currentSeason}</FieldError>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="totalSeasons" className="text-sm">
                                {t("totalSeasons")}
                            </FieldLabel>
                            <Input
                                id="totalSeasons"
                                value={totalSeasons}
                                onChange={(e) => {
                                    setTotalSeasons(e.target.value);
                                    handleFieldChange("totalSeasons", e.target.value);
                                }}
                                placeholder="1"
                                className="h-8"
                                aria-invalid={!!validationErrors.totalSeasons}
                            />
                            {validationErrors.totalSeasons && <FieldError className="text-xs">{validationErrors.totalSeasons}</FieldError>}
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel htmlFor="currentEpisode" className="text-sm">
                                {t("episode") || "Серия"}
                            </FieldLabel>
                            <Input
                                id="currentEpisode"
                                value={currentEpisode}
                                onChange={(e) => {
                                    setCurrentEpisode(e.target.value);
                                    handleFieldChange("currentEpisode", e.target.value);
                                }}
                                placeholder="1"
                                className="h-8"
                                aria-invalid={!!validationErrors.currentEpisode}
                            />
                            {validationErrors.currentEpisode && <FieldError className="text-xs">{validationErrors.currentEpisode}</FieldError>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="totalEpisodes" className="text-sm">
                                {t("totalEpisodes")}
                            </FieldLabel>
                            <Input
                                id="totalEpisodes"
                                value={totalEpisodes}
                                onChange={(e) => {
                                    setTotalEpisodes(e.target.value);
                                    handleFieldChange("totalEpisodes", e.target.value);
                                }}
                                placeholder="13"
                                className="h-8"
                                aria-invalid={!!validationErrors.totalEpisodes}
                            />
                            {validationErrors.totalEpisodes && <FieldError className="text-xs">{validationErrors.totalEpisodes}</FieldError>}
                        </Field>
                    </div>
                </>
            )}
            {/* Watching time (h:m:s) */}
            <Field>
                <FieldContent>
                    <FieldLabel className="text-sm">
                        {t("watchingTime")}
                    </FieldLabel>
                    <FieldDescription>
                        {t("watchingTimeDescription")}
                    </FieldDescription>
                </FieldContent>
                <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                        <Input
                            value={hours}
                            onChange={(e) => {
                                setHours(e.target.value);
                                handleFieldChange("hours", e.target.value);
                            }}
                            placeholder="0"
                            className="h-8 pr-7"
                            aria-invalid={!!validationErrors.hours}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("hoursShort")}</span>
                        {validationErrors.hours && <FieldError className="text-xs">{validationErrors.hours}</FieldError>}
                    </div>
                    <div className="relative">
                        <Input
                            value={minutes}
                            onChange={(e) => {
                                setMinutes(e.target.value);
                                handleFieldChange("minutes", e.target.value);
                            }}
                            placeholder="0"
                            className="h-8 pr-9"
                            aria-invalid={!!validationErrors.minutes}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("minutesShort")}</span>
                        {validationErrors.minutes && <FieldError className="text-xs">{validationErrors.minutes}</FieldError>}
                    </div>
                    <div className="relative">
                        <Input
                            value={seconds}
                            onChange={(e) => {
                                setSeconds(e.target.value);
                                handleFieldChange("seconds", e.target.value);
                            }}
                            placeholder="0"
                            className="h-8 pr-9"
                            aria-invalid={!!validationErrors.seconds}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("secondsShort")}</span>
                        {validationErrors.seconds && <FieldError className="text-xs">{validationErrors.seconds}</FieldError>}
                    </div>
                </div>
            </Field>
            {/* Runtime (total duration) — nice h:m input */}
            <Field>
                <FieldContent>
                    <FieldLabel className="text-sm">
                        {t("runtimeMinutes")}
                    </FieldLabel>
                    <FieldDescription>
                        {runtimeDesc}
                    </FieldDescription>
                </FieldContent>
                <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <Input
                            value={rtHours}
                            onChange={(e) => {
                                const v = e.target.value;
                                setRtHours(v);
                                syncRuntime(v, rtMins);
                            }}
                            placeholder="0"
                            className="h-8 pr-7"
                            aria-invalid={!!validationErrors.runtimeMinutes}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("hoursShort")}</span>
                    </div>
                    <div className="relative">
                        <Input
                            value={rtMins}
                            onChange={(e) => {
                                const v = e.target.value;
                                setRtMins(v);
                                syncRuntime(rtHours, v);
                            }}
                            placeholder="0"
                            className="h-8 pr-9"
                            aria-invalid={!!validationErrors.runtimeMinutes}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("minutesShort")}</span>
                    </div>
                </div>
                {validationErrors.runtimeMinutes && <FieldError className="text-xs">{validationErrors.runtimeMinutes}</FieldError>}
            </Field>
        </FieldGroup>
    );

    if (!wrapped) return content;

    return (
        <FieldSet>
            <FieldLegend variant="label">
                {t("trackingInfo")}
            </FieldLegend>
            {content}
        </FieldSet>
    );
}
