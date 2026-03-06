"use client";

import {useState, useEffect, useCallback} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {apiClient, getPosterUrl} from "@/lib/api";
import {useLocale} from "@/context/locale-context";
import {useSession} from "next-auth/react";
import {useGroup} from "@/context/group-context";
import {usePermissions} from "@/context/permissions-context";
import {
    EntryContentType,
    GroupType,
    WatchStatus,
} from "@/lib/api/generated";
import type {WatchEntryDto} from "@/lib/api/generated";
import {
    getContentTypeLabels,
    getWatchStatusLabels,
} from "@/lib/i18n/labels";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pencil,
    ListChecks,
    Star,
    MessageSquare,
    Loader2,
    Film,
    Calendar,
    RefreshCw,
} from "lucide-react";
import {Rating, RatingItem} from "@/components/ui/rating";
import {Controller} from "react-hook-form";
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
import {toast} from "sonner";
import {useImageCropper} from "@/hooks/use-image-cropper";
import {PosterUploadSection} from "@/components/entry/poster-upload-section";
import {SeriesTrackingSection} from "@/components/entry/series-tracking-section";
import {RatingSection} from "@/components/entry/rating-section";
import {MemberSelect} from "@/components/entry/member-select";
import {RelativeTimeCard} from "@/components/ui/relative-time-card";
import type {TranslationKeys} from "@/lib/i18n/en";

function createEditEntrySchema(t: (key: TranslationKeys) => string) {
    return z.object({
        status: z.nativeEnum(WatchStatus),
        comment: z.string().max(1000, t("commentTooLong")).optional().or(z.literal("")),
        currentSeason: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1), t("invalidNumber"))
            .optional().or(z.literal("")),
        currentEpisode: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1), t("invalidNumber"))
            .optional().or(z.literal("")),
        totalEpisodes: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1), t("invalidNumber"))
            .optional().or(z.literal("")),
        totalSeasons: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1), t("invalidNumber"))
            .optional().or(z.literal("")),
        runtimeSeconds: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1), t("invalidNumber"))
            .optional().or(z.literal("")),
        hours: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 0), t("invalidNumber"))
            .optional().or(z.literal("")),
        minutes: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 0 && +v <= 59), t("invalidTimeComponent"))
            .optional().or(z.literal("")),
        seconds: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 0 && +v <= 59), t("invalidTimeComponent"))
            .optional().or(z.literal("")),
        rewatchCount: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 0), t("invalidNumber"))
            .optional().or(z.literal("")),
    });
}

type EditEntryFormValues = z.infer<ReturnType<typeof createEditEntrySchema>>;

interface Props {
    entry: WatchEntryDto;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({entry, open, onOpenChange}: Props) {
    const {locale, t} = useLocale();
    const { data: session } = useSession();
    const user = session?.user;
    const {activeGroup} = useGroup();
    const {permissions, isLoading: isPermissionsLoading} = usePermissions();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const canEdit = (permissions.canEditOwnEntries && (entry as Record<string, unknown>).userId == user?.id) || permissions.canEditAllEntries;
    const canRateSelf = permissions.canRateSelf;
    const canRateOthers = permissions.canRateOthers;
    const isRateOnlyMode = !canEdit && canRateSelf;

    const myExistingRating = entry.ratings?.find((r) => r.userId === user?.id);

    // Non-form state
    const [myRating, setMyRating] = useState((myExistingRating?.rating ?? 0) / 2);
    const [selectedMembers, setSelectedMembers] = useState<string[]>(
        () => entry.ratings?.map((r) => r.userId!) ?? []
    );
    const [memberRatings, setMemberRatings] = useState<Record<string, number>>(
        () => {
            const map: Record<string, number> = {};
            entry.ratings?.forEach((r) => {
                map[r.userId!] = (r.rating ?? 0) / 2;
            });
            return map;
        }
    );
    const [posterRemoved, setPosterRemoved] = useState(false);
    const [error, setError] = useState("");

    const cropper = useImageCropper({
        initialPreview: getPosterUrl(entry.movie?.posterUrl),
        onPosterRemoved: () => setPosterRemoved(true),
    });

    const form = useForm<EditEntryFormValues>({
        resolver: zodResolver(createEditEntrySchema(t)),
        defaultValues: {
            status: entry.status ?? WatchStatus.Planned,
            comment: entry.comment || "",
            currentSeason: entry.currentSeason?.toString() || "",
            currentEpisode: entry.currentEpisode?.toString() || "",
            totalEpisodes: entry.totalEpisodes?.toString() || "",
            totalSeasons: entry.totalSeasons?.toString() || "",
            runtimeSeconds: entry.runtimeSeconds?.toString() || "",
            hours: entry.watchingTime ? Math.floor(entry.watchingTime / 3600).toString() : "",
            minutes: entry.watchingTime ? Math.floor((entry.watchingTime % 3600) / 60).toString() : "",
            seconds: entry.watchingTime ? (entry.watchingTime % 60).toString() : "",
            rewatchCount: entry.rewatchCount?.toString() || "",
        },
        mode: "onBlur",
    });

    // Reset form state when entry changes or dialog opens
    useEffect(() => {
        if (open) {
            const myRat = entry.ratings?.find((r) => r.userId === user?.id);
            form.reset({
                status: entry.status ?? WatchStatus.Planned,
                comment: entry.comment || "",
                currentSeason: entry.currentSeason?.toString() || "",
                currentEpisode: entry.currentEpisode?.toString() || "",
                totalEpisodes: entry.totalEpisodes?.toString() || "",
                totalSeasons: entry.totalSeasons?.toString() || "",
                runtimeSeconds: entry.runtimeSeconds?.toString() || "",
                hours: entry.watchingTime ? Math.floor(entry.watchingTime / 3600).toString() : "",
                minutes: entry.watchingTime ? Math.floor((entry.watchingTime % 3600) / 60).toString() : "",
                seconds: entry.watchingTime ? (entry.watchingTime % 60).toString() : "",
                rewatchCount: entry.rewatchCount?.toString() || "",
            });
            setMyRating((myRat?.rating ?? 0) / 2);
            setSelectedMembers(entry.ratings?.map((r) => r.userId!) ?? []);
            const map: Record<string, number> = {};
            entry.ratings?.forEach((r) => {
                map[r.userId!] = (r.rating ?? 0) / 2;
            });
            setMemberRatings(map);
            setPosterRemoved(false);
            setError("");
            cropper.resetCropper(getPosterUrl(entry.movie?.posterUrl));
        }
    }, [open, entry, form, user?.id, cropper.resetCropper]);

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);
    const queryClient = useQueryClient();

    const watchedStatus = form.watch("status");

    // --- Change detection helpers ---
    const hasEntryFieldsChanged = useCallback((): boolean => {
        const values = form.getValues();
        if (values.status !== entry.status) return true;
        if ((values.comment || "") !== (entry.comment || "")) return true;
        if (isGroupMode) {
            const origViewers = (entry.ratings?.map((r) => r.userId!) ?? []).slice().sort();
            const curViewers = selectedMembers.slice().sort();
            if (origViewers.length !== curViewers.length || origViewers.some((v, i) => v !== curViewers[i])) return true;
        }
        if ((values.status === WatchStatus.Watching || values.status === WatchStatus.Dropped)) {
            const isSeries = entry.movie?.type === EntryContentType.Anime || entry.movie?.type === EntryContentType.Series || entry.movie?.type === EntryContentType.Cartoon;
            if (isSeries) {
                if ((values.currentSeason || "") !== (entry.currentSeason?.toString() || "")) return true;
                if ((values.currentEpisode || "") !== (entry.currentEpisode?.toString() || "")) return true;
                if ((values.totalEpisodes || "") !== (entry.totalEpisodes?.toString() || "")) return true;
                if ((values.totalSeasons || "") !== (entry.totalSeasons?.toString() || "")) return true;
            }
            if ((values.runtimeSeconds || "") !== (entry.runtimeSeconds?.toString() || "")) return true;
            const newWt = (parseInt(values.hours || "0") * 3600 + parseInt(values.minutes || "0") * 60 + parseInt(values.seconds || "0"));
            if (newWt !== (entry.watchingTime || 0)) return true;
        }
        if ((values.rewatchCount || "0") !== (entry.rewatchCount?.toString() || "0")) return true;
        return false;
    }, [form, isGroupMode, selectedMembers, entry]);

    const hasPosterChanged = (): boolean => {
        return !!cropper.posterFile || posterRemoved;
    };

    const hasRatingsChanged = useCallback((): boolean => {
        if (isGroupMode) {
            const origMap: Record<string, number> = {};
            entry.ratings?.forEach((r) => {
                origMap[r.userId!] = r.rating ?? 0;
            });
            const uidsToCheck = canRateOthers ? selectedMembers : (user?.id ? [user.id] : []);
            for (const uid of uidsToCheck) {
                const newRating = Math.round((memberRatings[uid] ?? 0) * 2);
                const origRating = origMap[uid] ?? 0;
                if (newRating !== origRating) return true;
            }
        } else {
            const origRating = myExistingRating?.rating ?? 0;
            const newRating = Math.round(myRating * 2);
            if (newRating !== origRating) return true;
        }
        return false;
    }, [isGroupMode, selectedMembers, memberRatings, canRateOthers, user?.id, myRating, myExistingRating, entry.ratings]);

    const hasChanges = isRateOnlyMode
        ? hasRatingsChanged()
        : (hasEntryFieldsChanged() || hasPosterChanged() || hasRatingsChanged());

    const mutation = useMutation({
        mutationFn: async (overridePosterFile?: File | null) => {
            const values = form.getValues();
            const ratingsChanged = hasRatingsChanged();

            if (isRateOnlyMode) {
                if (ratingsChanged && user?.id) {
                    if (isGroupMode && canRateOthers) {
                        const origMap: Record<string, number> = {};
                        entry.ratings?.forEach((r) => {
                            origMap[r.userId!] = r.rating ?? 0;
                        });
                        for (const uid of selectedMembers) {
                            const newRating = Math.round((memberRatings[uid] ?? 0) * 2);
                            const origRating = origMap[uid] ?? 0;
                            if (newRating !== origRating) {
                                await apiClient.api.watchEntriesRateCreate(entry.id!, {rating: newRating, targetUserId: uid});
                            }
                        }
                    } else {
                        const currentRating = isGroupMode ? (memberRatings[user.id] ?? 0) : myRating;
                        await apiClient.api.watchEntriesRateCreate(entry.id!, {rating: Math.round(currentRating * 2)});
                    }
                }
                return;
            }

            const entryChanged = hasEntryFieldsChanged();
            const posterChanged = hasPosterChanged();
            const fileToUpload = overridePosterFile ?? cropper.posterFile;

            if (!entryChanged && !posterChanged && !ratingsChanged) return;

            if (fileToUpload) {
                const uploadRes = await apiClient.api.uploadPosterCreate({file: fileToUpload});
                const posterUrl = (uploadRes.data.id || 0).toString();
                await apiClient.api.moviesUpdate(entry.movieId!, {posterUrl});
            } else if (posterRemoved) {
                await apiClient.api.moviesUpdate(entry.movieId!, {posterUrl: ""});
            }

            if (entryChanged) {
                const isSeries = entry.movie?.type === EntryContentType.Anime ||
                    entry.movie?.type === EntryContentType.Series ||
                    entry.movie?.type === EntryContentType.Cartoon;

                await apiClient.api.watchEntriesUpdate(entry.id!, {
                    status: values.status,
                    comment: values.comment || undefined,
                    ...((values.status === WatchStatus.Watching || values.status === WatchStatus.Dropped) ? {
                        ...(isSeries ? {
                            currentSeason: values.currentSeason ? parseInt(values.currentSeason) : undefined,
                            currentEpisode: values.currentEpisode ? parseInt(values.currentEpisode) : undefined,
                            totalEpisodes: values.totalEpisodes ? parseInt(values.totalEpisodes) : undefined,
                            totalSeasons: values.totalSeasons ? parseInt(values.totalSeasons) : undefined,
                        } : {}),
                        runtimeSeconds: values.runtimeSeconds ? parseInt(values.runtimeSeconds) : undefined,
                        watchingTime: (values.hours || values.minutes || values.seconds)
                            ? (parseInt(values.hours || "0") * 3600 + parseInt(values.minutes || "0") * 60 + parseInt(values.seconds || "0"))
                            : undefined,
                    } : {}),
                    ...((values.status === WatchStatus.Completed || values.status === WatchStatus.Watching) ? {
                        rewatchCount: values.rewatchCount ? parseInt(values.rewatchCount) : 0,
                    } : {}),
                });
            }

            if (ratingsChanged && (values.status === WatchStatus.Completed || values.status === WatchStatus.Dropped) && user?.id) {
                if (isGroupMode && canRateOthers) {
                    const origMap: Record<string, number> = {};
                    entry.ratings?.forEach((r) => {
                        origMap[r.userId!] = r.rating ?? 0;
                    });
                    for (const uid of selectedMembers) {
                        const newRating = Math.round((memberRatings[uid] ?? 0) * 2);
                        const origRating = origMap[uid] ?? 0;
                        if (newRating !== origRating) {
                            await apiClient.api.watchEntriesRateCreate(entry.id!, {rating: newRating, targetUserId: uid});
                        }
                    }
                } else {
                    const currentRating = isGroupMode ? (memberRatings[user.id] ?? 0) : myRating;
                    await apiClient.api.watchEntriesRateCreate(entry.id!, {rating: Math.round(currentRating * 2)});
                }
            }
        },
        onSuccess: () => {
            toast.success(isRateOnlyMode ? t("ratingUpdated") : t("postUpdated"), {position: "top-center"});
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            queryClient.invalidateQueries({queryKey: ["stats"]});
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const err = error as Record<string, Record<string, Record<string, string>>>;
            const errorMessage = err?.response?.data?.message || (isRateOnlyMode ? t("failedToRate") : t("failedToUpdate"));
            toast.error(errorMessage, {position: "top-center"});
            setError(isRateOnlyMode ? t("failedToRate") : t("failedToUpdate"));
        },
    });

    const handleToggleMember = (userId: string) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers((prev) => prev.filter((id) => id !== userId));
            setMemberRatings((prev) => {
                const next = {...prev};
                delete next[userId];
                return next;
            });
        } else {
            setSelectedMembers((prev) => [...prev, userId]);
        }
    };

    const handleMemberRatingChange = (uid: string, value: number) => {
        setMemberRatings((prev) => ({...prev, [uid]: value}));
    };

    const handleRateOnlyMemberRatingChange = (uid: string, value: number) => {
        setMemberRatings((prev) => ({...prev, [uid]: value}));
        if (!selectedMembers.includes(uid)) {
            setSelectedMembers((prev) => [...prev, uid]);
        }
    };

    const handleRateOnlySelfRatingChange = (value: number) => {
        if (isGroupMode && user?.id) {
            setMemberRatings((prev) => ({...prev, [user.id!]: value}));
            if (!selectedMembers.includes(user.id!)) {
                setSelectedMembers((prev) => [...prev, user.id!]);
            }
        } else {
            setMyRating(value);
        }
    };

    const handleSubmit = async () => {
        if (!hasChanges) return;

        // Member rating validation
        if (isGroupMode && (watchedStatus === WatchStatus.Completed || watchedStatus === WatchStatus.Dropped)) {
            const hasInvalidRating = selectedMembers.some(uid => {
                const rating = memberRatings[uid] || 0;
                return rating && (rating < 1 || rating > 10);
            });
            if (hasInvalidRating) {
                setError(t("fixValidationErrors"));
                return;
            }
        }

        setError("");

        let croppedFile: File | null = null;
        if (cropper.isCropping && cropper.editorImageSrc) {
            try {
                croppedFile = await cropper.applyCropAndGetFile();
            } catch {
                toast.error(t("cropFailed"), {position: "top-center"});
                return;
            }
        }

        mutation.mutate(croppedFile);
    };

    const handleFieldChange = (name: string, value: string) => {
        form.setValue(name as keyof EditEntryFormValues, value, {shouldValidate: true});
    };

    // Build validation errors for SeriesTrackingSection
    const validationErrors: Record<string, string> = {};
    const formErrors = form.formState.errors;
    for (const key of ["currentSeason", "currentEpisode", "totalEpisodes", "totalSeasons", "runtimeSeconds", "hours", "minutes", "seconds"] as const) {
        if (formErrors[key]?.message) {
            validationErrors[key] = formErrors[key].message as string;
        }
    }

    const showTracking = watchedStatus === WatchStatus.Watching || watchedStatus === WatchStatus.Dropped;

    const showRating = watchedStatus === WatchStatus.Completed || watchedStatus === WatchStatus.Dropped;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isRateOnlyMode ? (
                            <>
                                <Star className="h-5 w-5"/>
                                {t("rateOnlyTitle")}
                            </>
                        ) : (
                            <>
                                <Pencil className="h-5 w-5"/>
                                {t("editEntry")}
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div style={{maxHeight: "calc(85vh - 120px)"}}>
                        <div className="bg-muted p-3 rounded-lg mb-4 flex items-center gap-3">
                            <Film className="h-5 w-5 text-muted-foreground shrink-0"/>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold">{entry.movie?.title}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    {contentTypeLabels[entry.movie!.type! as EntryContentType]}
                                    {entry.movie?.year && (
                                        <>
                                            <Calendar className="h-3 w-3 ml-1"/>
                                            {entry.movie?.year}
                                        </>
                                    )}
                                </p>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {entry.createdAt && (
                                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                            {t("created")}: <RelativeTimeCard date={entry.createdAt} variant="muted" className="text-xs" tabIndex={-1}/>
                                        </span>
                                    )}
                                    {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                                            {t("lastModified")}: <RelativeTimeCard date={entry.updatedAt} variant="muted" className="text-xs" tabIndex={-1}/>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isPermissionsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                            </div>
                        ) : isRateOnlyMode ? (
                            /* Rate-only form */
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleSubmit();
                            }} className="space-y-4 pr-4">
                                <p className="text-sm text-muted-foreground">{t("rateOnlyDescription")}</p>

                                <Field>
                                    <FieldLabel className="flex items-center gap-1.5">
                                        <ListChecks className="h-3.5 w-3.5"/>
                                        {t("status")}
                                    </FieldLabel>
                                    <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                        {watchStatusLabels[watchedStatus]}
                                    </div>
                                </Field>

                                {entry.comment && (
                                    <Field>
                                        <FieldLabel className="flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5"/>
                                            {t("comment")}
                                        </FieldLabel>
                                        <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md whitespace-pre-wrap">
                                            {entry.comment}
                                        </div>
                                    </Field>
                                )}

                                {isGroupMode && canRateOthers ? (
                                    <FieldSet>
                                        <FieldLegend variant="label" className="flex items-center gap-1.5">
                                            <Star className="h-3.5 w-3.5"/>
                                            {t("ratings")}
                                        </FieldLegend>
                                        <FieldGroup className="gap-4">
                                            {(activeGroup?.members ?? []).map((m) => (
                                                <Field key={m.userId} orientation="horizontal">
                                                    <FieldLabel className="flex items-center gap-1.5 min-w-0 shrink-0">
                                                        {m.displayName}
                                                    </FieldLabel>
                                                    <div className="flex items-center gap-4">
                                                        <div className="opacity-50">
                                                            {memberRatings[m.userId!] || 0}/10
                                                        </div>
                                                        <Rating
                                                            value={memberRatings[m.userId!] || 0}
                                                            onValueChange={(v) => handleRateOnlyMemberRatingChange(m.userId!, v)}
                                                            max={10}
                                                            step={0.5}
                                                            clearable
                                                        >
                                                            {Array.from({length: 10}, (_, i) => (
                                                                <RatingItem key={i}/>
                                                            ))}
                                                        </Rating>
                                                    </div>
                                                </Field>
                                            ))}
                                        </FieldGroup>
                                    </FieldSet>
                                ) : (
                                    <Field>
                                        <FieldLabel className="flex items-center gap-1.5">
                                            <Star className="h-3.5 w-3.5"/>
                                            {t("myRatingLabel")}
                                        </FieldLabel>
                                        <div className="flex items-center gap-4">
                                            <Rating
                                                value={isGroupMode ? (memberRatings[user?.id ?? ""] || 0) : myRating}
                                                onValueChange={handleRateOnlySelfRatingChange}
                                                max={10}
                                                step={0.5}
                                                clearable
                                            >
                                                {Array.from({length: 10}, (_, i) => (
                                                    <RatingItem key={i}/>
                                                ))}
                                            </Rating>
                                            <div className="opacity-50">
                                                {isGroupMode ? (memberRatings[user?.id ?? ""] || 0) : myRating}/10
                                            </div>
                                        </div>
                                    </Field>
                                )}

                                {error && (
                                    <p className="text-sm text-destructive text-center">{error}</p>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                        className="flex-1"
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={mutation.isPending || !hasChanges}
                                        className="flex-1"
                                    >
                                        {mutation.isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
                                                {t("saving")}
                                            </>
                                        ) : (
                                            t("save")
                                        )}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            /* Full edit form */
                                <form onSubmit={form.handleSubmit(handleSubmit, () => setError(t("fixValidationErrors")))} className="space-y-4 pr-4">
                                    <PosterUploadSection
                                        cropper={cropper}
                                        fileInputRef={cropper.fileInputRef}
                                        onFileChange={cropper.handleFileChange}
                                        gridSwitchId="edit-crop-grid"
                                        canReCropFromPreview
                                        showPasteInPreview
                                    />

                                    <FieldGroup className="gap-4">
                                        <Controller
                                            control={form.control}
                                            name="status"
                                            render={({field, fieldState}) => (
                                                <Field data-invalid={fieldState.invalid || undefined}>
                                                    <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                        <ListChecks className="h-3.5 w-3.5"/>
                                                        {t("status")}
                                                    </FieldLabel>
                                                    <Select
                                                        value={field.value}
                                                        onValueChange={field.onChange}
                                                        disabled={!canEdit}
                                                    >
                                                        <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(watchStatusLabels).map(([value, label]) => (
                                                                <SelectItem key={value}
                                                                            value={value}>{label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                                </Field>
                                            )}
                                        />
                                        {(watchedStatus === WatchStatus.Completed || watchedStatus === WatchStatus.Watching) && (
                                            <Controller
                                                control={form.control}
                                                name="rewatchCount"
                                                render={({field, fieldState}) => (
                                                    <Field data-invalid={fieldState.invalid || undefined}>
                                                        <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                            <RefreshCw className="h-3.5 w-3.5"/>
                                                            {t("rewatchCount")}
                                                        </FieldLabel>
                                                        <Input
                                                            {...field}
                                                            id={field.name}
                                                            type="number"
                                                            min={0}
                                                            placeholder="0"
                                                            disabled={!canEdit}
                                                            aria-invalid={fieldState.invalid}
                                                        />
                                                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                                    </Field>
                                                )}
                                            />
                                        )}
                                    </FieldGroup>

                                    {isGroupMode ? (
                                        <>
                                            <MemberSelect
                                                members={activeGroup?.members ?? []}
                                                selectedMembers={selectedMembers}
                                                onToggleMember={handleToggleMember}
                                                disabled={!canEdit}
                                            />

                                            {showRating && selectedMembers.length > 0 && (
                                                <RatingSection
                                                    isGroupMode
                                                    members={activeGroup?.members ?? []}
                                                    selectedMembers={selectedMembers}
                                                    memberRatings={memberRatings}
                                                    onMemberRatingChange={handleMemberRatingChange}
                                                    myRating={myRating}
                                                    onMyRatingChange={setMyRating}
                                                    canRateOthers={canRateOthers ?? false}
                                                    canRateSelf={canRateSelf ?? false}
                                                    currentUserId={user?.id}
                                                />
                                            )}

                                            {showTracking && (
                                                <SeriesTrackingSection
                                                    contentType={entry.movie?.type ?? EntryContentType.Movie}
                                                    currentSeason={form.watch("currentSeason") ?? ""}
                                                    setCurrentSeason={(v) => form.setValue("currentSeason", v, {shouldValidate: true})}
                                                    currentEpisode={form.watch("currentEpisode") ?? ""}
                                                    setCurrentEpisode={(v) => form.setValue("currentEpisode", v, {shouldValidate: true})}
                                                    totalEpisodes={form.watch("totalEpisodes") ?? ""}
                                                    setTotalEpisodes={(v) => form.setValue("totalEpisodes", v, {shouldValidate: true})}
                                                    totalSeasons={form.watch("totalSeasons") ?? ""}
                                                    setTotalSeasons={(v) => form.setValue("totalSeasons", v, {shouldValidate: true})}
                                                    runtimeSeconds={form.watch("runtimeSeconds") ?? ""}
                                                    setRuntimeSeconds={(v) => form.setValue("runtimeSeconds", v, {shouldValidate: true})}
                                                    hours={form.watch("hours") ?? ""}
                                                    setHours={(v) => form.setValue("hours", v, {shouldValidate: true})}
                                                    minutes={form.watch("minutes") ?? ""}
                                                    setMinutes={(v) => form.setValue("minutes", v, {shouldValidate: true})}
                                                    seconds={form.watch("seconds") ?? ""}
                                                    setSeconds={(v) => form.setValue("seconds", v, {shouldValidate: true})}
                                                    handleFieldChange={handleFieldChange}
                                                    validationErrors={validationErrors}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {showRating && (
                                                <RatingSection
                                                    isGroupMode={false}
                                                    members={[]}
                                                    selectedMembers={[]}
                                                    memberRatings={{}}
                                                    onMemberRatingChange={() => {
                                                    }}
                                                    myRating={myRating}
                                                    onMyRatingChange={setMyRating}
                                                    canRateOthers={false}
                                                    canRateSelf
                                                    currentUserId={user?.id}
                                                />
                                            )}

                                            {showTracking && (
                                                <SeriesTrackingSection
                                                    contentType={entry.movie?.type ?? EntryContentType.Movie}
                                                    currentSeason={form.watch("currentSeason") ?? ""}
                                                    setCurrentSeason={(v) => form.setValue("currentSeason", v, {shouldValidate: true})}
                                                    currentEpisode={form.watch("currentEpisode") ?? ""}
                                                    setCurrentEpisode={(v) => form.setValue("currentEpisode", v, {shouldValidate: true})}
                                                    totalEpisodes={form.watch("totalEpisodes") ?? ""}
                                                    setTotalEpisodes={(v) => form.setValue("totalEpisodes", v, {shouldValidate: true})}
                                                    totalSeasons={form.watch("totalSeasons") ?? ""}
                                                    setTotalSeasons={(v) => form.setValue("totalSeasons", v, {shouldValidate: true})}
                                                    runtimeSeconds={form.watch("runtimeSeconds") ?? ""}
                                                    setRuntimeSeconds={(v) => form.setValue("runtimeSeconds", v, {shouldValidate: true})}
                                                    hours={form.watch("hours") ?? ""}
                                                    setHours={(v) => form.setValue("hours", v, {shouldValidate: true})}
                                                    minutes={form.watch("minutes") ?? ""}
                                                    setMinutes={(v) => form.setValue("minutes", v, {shouldValidate: true})}
                                                    seconds={form.watch("seconds") ?? ""}
                                                    setSeconds={(v) => form.setValue("seconds", v, {shouldValidate: true})}
                                                    handleFieldChange={handleFieldChange}
                                                    validationErrors={validationErrors}
                                                />
                                            )}
                                        </>
                                    )}

                                    <FieldGroup className="gap-4">
                                        <Controller
                                            control={form.control}
                                            name="comment"
                                            render={({field, fieldState}) => (
                                                <Field data-invalid={fieldState.invalid || undefined}>
                                                    <FieldContent>
                                                        <FieldLabel htmlFor={field.name}
                                                                    className="flex items-center gap-1.5">
                                                            <MessageSquare className="h-3.5 w-3.5"/>
                                                            {t("comment")}
                                                        </FieldLabel>
                                                        <FieldDescription>{t("commentDescription")}</FieldDescription>
                                                    </FieldContent>
                                                    <Textarea
                                                        {...field}
                                                        id={field.name}
                                                        disabled={!canEdit}
                                                        rows={3}
                                                        placeholder={t("commentPlaceholder")}
                                                        aria-invalid={fieldState.invalid}
                                                    />
                                                    {fieldState.error && (
                                                        <FieldError>{fieldState.error.message}</FieldError>
                                                    )}
                                                </Field>
                                            )}
                                        />
                                    </FieldGroup>

                                    {error && (
                                        <p className="text-sm text-destructive text-center">{error}</p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => onOpenChange(false)}
                                            className="flex-1"
                                        >
                                            {t("cancel")}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={mutation.isPending || !hasChanges}
                                            className="flex-1"
                                        >
                                            {mutation.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
                                                    {t("saving")}
                                                </>
                                            ) : (
                                                t("save")
                                            )}
                                        </Button>
                                    </div>
                                </form>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
