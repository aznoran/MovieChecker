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
    runtimeSeconds: string;
    setRuntimeSeconds: (v: string) => void;
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

/** Parse string to non-negative int, or 0 if empty/invalid */
function toInt(v: string): number {
    const n = parseInt(v);
    return isNaN(n) || n < 0 ? 0 : n;
}

/** Filter input to digits only, return empty string for non-digit input */
function digitsOnly(v: string): string {
    return v.replace(/\D/g, "");
}

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
    runtimeSeconds,
    setRuntimeSeconds,
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

    // Internal state for runtime hours:minutes:seconds display
    const [rtHours, setRtHours] = useState("");
    const [rtMins, setRtMins] = useState("");
    const [rtSecs, setRtSecs] = useState("");

    // Sync from parent runtimeSeconds → internal h:m:s
    useEffect(() => {
        const total = parseInt(runtimeSeconds);
        if (!runtimeSeconds || isNaN(total)) {
            setRtHours("");
            setRtMins("");
            setRtSecs("");
            return;
        }
        setRtHours(Math.floor(total / 3600).toString());
        const remainAfterHours = total % 3600;
        const m = Math.floor(remainAfterHours / 60);
        setRtMins(m > 0 ? m.toString() : "");
        const s = remainAfterHours % 60;
        setRtSecs(s > 0 ? s.toString() : "");
    }, []); // only on mount

    // Sync internal h:m:s → parent runtimeSeconds
    const syncRuntime = useCallback((h: string, m: string, s: string) => {
        const hrs = parseInt(h) || 0;
        const mins = parseInt(m) || 0;
        const secs = parseInt(s) || 0;
        if (hrs === 0 && mins === 0 && secs === 0 && !h && !m && !s) {
            setRuntimeSeconds("");
            handleFieldChange("runtimeSeconds", "");
        } else {
            const total = (hrs * 3600 + mins * 60 + secs).toString();
            setRuntimeSeconds(total);
            handleFieldChange("runtimeSeconds", total);
        }
    }, [setRuntimeSeconds, handleFieldChange]);

    // --- Clamping helpers ---

    /** Clamp watching time fields so total doesn't exceed runtime */
    const clampWatchingTime = useCallback((newH: string, newM: string, newS: string) => {
        const h = Math.min(toInt(newH), 300);
        const m = Math.min(toInt(newM), 59);
        const s = Math.min(toInt(newS), 59);

        const rtSec = parseInt(runtimeSeconds);
        if (!runtimeSeconds || isNaN(rtSec) || rtSec <= 0) {
            return { h: newH ? h.toString() : "", m: newM ? m.toString() : "", s: newS ? s.toString() : "" };
        }

        const maxSec = rtSec;
        const totalSec = h * 3600 + m * 60 + s;

        if (totalSec <= maxSec) {
            return { h: newH ? h.toString() : "", m: newM ? m.toString() : "", s: newS ? s.toString() : "" };
        }

        // Clamp to max
        return {
            h: Math.floor(maxSec / 3600).toString(),
            m: Math.floor((maxSec % 3600) / 60).toString(),
            s: (maxSec % 60).toString(),
        };
    }, [runtimeSeconds]);

    /** When runtime changes, clamp watching time if it now exceeds */
    const clampWatchingTimeToNewRuntime = useCallback((newRuntimeSeconds: string) => {
        const rtSec = parseInt(newRuntimeSeconds);
        if (!newRuntimeSeconds || isNaN(rtSec) || rtSec <= 0) return;

        const maxSec = rtSec;
        const h = toInt(hours);
        const m = toInt(minutes);
        const s = toInt(seconds);
        const totalSec = h * 3600 + m * 60 + s;

        if (totalSec > maxSec) {
            const newH = Math.floor(maxSec / 3600).toString();
            const newM = Math.floor((maxSec % 3600) / 60).toString();
            const newS = (maxSec % 60).toString();
            setHours(newH);
            setMinutes(newM);
            setSeconds(newS);
            handleFieldChange("hours", newH);
            handleFieldChange("minutes", newM);
            handleFieldChange("seconds", newS);
        }
    }, [hours, minutes, seconds, setHours, setMinutes, setSeconds, handleFieldChange]);

    // Handlers for watching time h:m:s
    const onHoursChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        const clamped = clampWatchingTime(v, minutes, seconds);
        setHours(clamped.h);
        handleFieldChange("hours", clamped.h);
        if (clamped.m !== (minutes ? toInt(minutes).toString() : "")) {
            setMinutes(clamped.m);
            handleFieldChange("minutes", clamped.m);
        }
        if (clamped.s !== (seconds ? toInt(seconds).toString() : "")) {
            setSeconds(clamped.s);
            handleFieldChange("seconds", clamped.s);
        }
    }, [clampWatchingTime, minutes, seconds, setHours, setMinutes, setSeconds, handleFieldChange]);

    const onMinutesChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        const clamped = clampWatchingTime(hours, v, seconds);
        setMinutes(clamped.m);
        handleFieldChange("minutes", clamped.m);
        if (clamped.h !== (hours ? toInt(hours).toString() : "")) {
            setHours(clamped.h);
            handleFieldChange("hours", clamped.h);
        }
        if (clamped.s !== (seconds ? toInt(seconds).toString() : "")) {
            setSeconds(clamped.s);
            handleFieldChange("seconds", clamped.s);
        }
    }, [clampWatchingTime, hours, seconds, setHours, setMinutes, setSeconds, handleFieldChange]);

    const onSecondsChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        const clamped = clampWatchingTime(hours, minutes, v);
        setSeconds(clamped.s);
        handleFieldChange("seconds", clamped.s);
        if (clamped.h !== (hours ? toInt(hours).toString() : "")) {
            setHours(clamped.h);
            handleFieldChange("hours", clamped.h);
        }
        if (clamped.m !== (minutes ? toInt(minutes).toString() : "")) {
            setMinutes(clamped.m);
            handleFieldChange("minutes", clamped.m);
        }
    }, [clampWatchingTime, hours, minutes, setHours, setMinutes, setSeconds, handleFieldChange]);

    /** Clear watching time fields */
    const clearWatchingTime = useCallback(() => {
        setHours("");
        setMinutes("");
        setSeconds("");
        handleFieldChange("hours", "");
        handleFieldChange("minutes", "");
        handleFieldChange("seconds", "");
    }, [setHours, setMinutes, setSeconds, handleFieldChange]);

    /** After runtime changes: clamp watching time, or clear it if runtime became zero */
    const adjustWatchingTimeForNewRuntime = useCallback((newH: string, newM: string, newS: string) => {
        const totalRt = (parseInt(newH) || 0) * 3600 + (parseInt(newM) || 0) * 60 + (parseInt(newS) || 0);
        if (totalRt <= 0) {
            // Runtime cleared → clear watching time too
            const hadWt = toInt(hours) > 0 || toInt(minutes) > 0 || toInt(seconds) > 0;
            if (hadWt) clearWatchingTime();
            return;
        }
        clampWatchingTimeToNewRuntime(totalRt.toString());
    }, [hours, minutes, seconds, clearWatchingTime, clampWatchingTimeToNewRuntime]);

    // Handlers for runtime h:m:s — also clamp watching time if needed
    const onRtHoursChange = useCallback((raw: string) => {
        let v = digitsOnly(raw);
        // Cap hours at 300
        if (v && parseInt(v) > 300) v = "300";
        setRtHours(v);
        syncRuntime(v, rtMins, rtSecs);
        adjustWatchingTimeForNewRuntime(v, rtMins, rtSecs);
    }, [rtMins, rtSecs, syncRuntime, adjustWatchingTimeForNewRuntime]);

    const onRtMinsChange = useCallback((raw: string) => {
        let v = digitsOnly(raw);
        // Cap minutes at 59
        if (v && parseInt(v) > 59) v = "59";
        setRtMins(v);
        syncRuntime(rtHours, v, rtSecs);
        adjustWatchingTimeForNewRuntime(rtHours, v, rtSecs);
    }, [rtHours, rtSecs, syncRuntime, adjustWatchingTimeForNewRuntime]);

    const onRtSecsChange = useCallback((raw: string) => {
        let v = digitsOnly(raw);
        // Cap seconds at 59
        if (v && parseInt(v) > 59) v = "59";
        setRtSecs(v);
        syncRuntime(rtHours, rtMins, v);
        adjustWatchingTimeForNewRuntime(rtHours, rtMins, v);
    }, [rtHours, rtMins, syncRuntime, adjustWatchingTimeForNewRuntime]);

    // Handlers for season/episode with clamping
    const onCurrentSeasonChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        const max = toInt(totalSeasons);
        if (v && max > 0 && toInt(v) > max) {
            setCurrentSeason(max.toString());
            handleFieldChange("currentSeason", max.toString());
        } else {
            setCurrentSeason(v);
            handleFieldChange("currentSeason", v);
        }
    }, [totalSeasons, setCurrentSeason, handleFieldChange]);

    const onTotalSeasonsChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        setTotalSeasons(v);
        handleFieldChange("totalSeasons", v);
        // Clamp currentSeason if it exceeds new total
        const max = toInt(v);
        if (v && max > 0 && toInt(currentSeason) > max) {
            setCurrentSeason(max.toString());
            handleFieldChange("currentSeason", max.toString());
        }
    }, [currentSeason, setCurrentSeason, setTotalSeasons, handleFieldChange]);

    const onCurrentEpisodeChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        const max = toInt(totalEpisodes);
        if (v && max > 0 && toInt(v) > max) {
            setCurrentEpisode(max.toString());
            handleFieldChange("currentEpisode", max.toString());
        } else {
            setCurrentEpisode(v);
            handleFieldChange("currentEpisode", v);
        }
    }, [totalEpisodes, setCurrentEpisode, handleFieldChange]);

    const onTotalEpisodesChange = useCallback((raw: string) => {
        const v = digitsOnly(raw);
        setTotalEpisodes(v);
        handleFieldChange("totalEpisodes", v);
        // Clamp currentEpisode if it exceeds new total
        const max = toInt(v);
        if (v && max > 0 && toInt(currentEpisode) > max) {
            setCurrentEpisode(max.toString());
            handleFieldChange("currentEpisode", max.toString());
        }
    }, [currentEpisode, setCurrentEpisode, setTotalEpisodes, handleFieldChange]);

    // Dynamic description based on content type
    const runtimeDescKey: Record<EntryContentType, string> = {
        [EntryContentType.Movie]: "runtimeDescriptionMovie",
        [EntryContentType.Series]: "runtimeDescriptionSeries",
        [EntryContentType.Anime]: "runtimeDescriptionSeries",
        [EntryContentType.Cartoon]: "runtimeDescriptionCartoon",
        [EntryContentType.Show]: "runtimeDescriptionShow",
    };
    const runtimeDesc = t(runtimeDescKey[contentType] as Parameters<typeof t>[0]);

    // Compute smart blocking for watching time fields
    const rtSecTotal = toInt(runtimeSeconds);
    const hasRuntime = !!runtimeSeconds && rtSecTotal > 0;
    const wtHoursDisabled = !hasRuntime || rtSecTotal < 3600;
    const wtMinutesDisabled = !hasRuntime || rtSecTotal < 60;
    const wtSecondsDisabled = !hasRuntime;

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
                                onChange={(e) => onCurrentSeasonChange(e.target.value)}
                                placeholder="1"
                                className="h-8"
                                inputMode="numeric"
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
                                onChange={(e) => onTotalSeasonsChange(e.target.value)}
                                placeholder="1"
                                className="h-8"
                                inputMode="numeric"
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
                                onChange={(e) => onCurrentEpisodeChange(e.target.value)}
                                placeholder="1"
                                className="h-8"
                                inputMode="numeric"
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
                                onChange={(e) => onTotalEpisodesChange(e.target.value)}
                                placeholder="13"
                                className="h-8"
                                inputMode="numeric"
                                aria-invalid={!!validationErrors.totalEpisodes}
                            />
                            {validationErrors.totalEpisodes && <FieldError className="text-xs">{validationErrors.totalEpisodes}</FieldError>}
                        </Field>
                    </div>
                </>
            )}
            {/* Runtime (total duration) — h:m:s input */}
            <Field>
                <FieldContent>
                    <FieldLabel className="text-sm">
                        {t("runtimeSeconds")}
                    </FieldLabel>
                    <FieldDescription>
                        {runtimeDesc}
                    </FieldDescription>
                </FieldContent>
                <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                        <Input
                            value={rtHours}
                            onChange={(e) => onRtHoursChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-7"
                            inputMode="numeric"
                            aria-invalid={!!validationErrors.runtimeSeconds}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("hoursShort")}</span>
                    </div>
                    <div className="relative">
                        <Input
                            value={rtMins}
                            onChange={(e) => onRtMinsChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-9"
                            inputMode="numeric"
                            aria-invalid={!!validationErrors.runtimeSeconds}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("minutesShort")}</span>
                    </div>
                    <div className="relative">
                        <Input
                            value={rtSecs}
                            onChange={(e) => onRtSecsChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-9"
                            inputMode="numeric"
                            aria-invalid={!!validationErrors.runtimeSeconds}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("secondsShort")}</span>
                    </div>
                </div>
                {validationErrors.runtimeSeconds && <FieldError className="text-xs">{validationErrors.runtimeSeconds}</FieldError>}
            </Field>
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
                            onChange={(e) => onHoursChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-7"
                            inputMode="numeric"
                            disabled={wtHoursDisabled}
                            aria-invalid={!!validationErrors.hours}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("hoursShort")}</span>
                    </div>
                    <div className="relative">
                        <Input
                            value={minutes}
                            onChange={(e) => onMinutesChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-9"
                            inputMode="numeric"
                            disabled={wtMinutesDisabled}
                            aria-invalid={!!validationErrors.minutes}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("minutesShort")}</span>
                    </div>
                    <div className="relative">
                        <Input
                            value={seconds}
                            onChange={(e) => onSecondsChange(e.target.value)}
                            placeholder="0"
                            className="h-8 pr-9"
                            inputMode="numeric"
                            disabled={wtSecondsDisabled}
                            aria-invalid={!!validationErrors.seconds}
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t("secondsShort")}</span>
                    </div>
                </div>
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
