"use client";

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

interface SeriesTrackingSectionProps {
    currentSeason: string;
    setCurrentSeason: (v: string) => void;
    currentEpisode: string;
    setCurrentEpisode: (v: string) => void;
    totalEpisodes: string;
    setTotalEpisodes: (v: string) => void;
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

export function SeriesTrackingSection({
    currentSeason,
    setCurrentSeason,
    currentEpisode,
    setCurrentEpisode,
    totalEpisodes,
    setTotalEpisodes,
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

    const content = (
        <FieldGroup className="gap-4">
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
            </div>
            <Field>
                <FieldLabel htmlFor="totalEpisodes" className="text-sm">
                    {t("totalEpisodes") || "Всего серий"}
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
                    <div>
                        <Input
                            value={hours}
                            onChange={(e) => {
                                setHours(e.target.value);
                                handleFieldChange("hours", e.target.value);
                            }}
                            placeholder="Часы"
                            className="h-8"
                            aria-invalid={!!validationErrors.hours}
                        />
                        {validationErrors.hours && <FieldError className="text-xs">{validationErrors.hours}</FieldError>}
                    </div>
                    <div>
                        <Input
                            value={minutes}
                            onChange={(e) => {
                                setMinutes(e.target.value);
                                handleFieldChange("minutes", e.target.value);
                            }}
                            placeholder="Минуты"
                            className="h-8"
                            aria-invalid={!!validationErrors.minutes}
                        />
                        {validationErrors.minutes && <FieldError className="text-xs">{validationErrors.minutes}</FieldError>}
                    </div>
                    <div>
                        <Input
                            value={seconds}
                            onChange={(e) => {
                                setSeconds(e.target.value);
                                handleFieldChange("seconds", e.target.value);
                            }}
                            placeholder="Секунды"
                            className="h-8"
                            aria-invalid={!!validationErrors.seconds}
                        />
                        {validationErrors.seconds && <FieldError className="text-xs">{validationErrors.seconds}</FieldError>}
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
