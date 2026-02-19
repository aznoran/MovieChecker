"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWatchEntry, updateMovie, uploadPoster, getPosterUrl, rateEntry } from "@/lib/api";
import { useLocale } from "@/context/locale-context";
import { useAuth } from "@/context/auth-context";
import { useGroup } from "@/context/group-context";
import { usePermissions } from "@/context/permissions-context";
import {
    EntryContentType,
    GroupType,
    WatchStatus,
} from "@/lib/api.generated";
import type { WatchEntryDto } from "@/lib/api.generated";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { Rating, RatingItem } from "@/components/ui/rating";
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
import { toast } from "sonner";
import { useImageCropper } from "@/hooks/use-image-cropper";
import { useEntryValidation } from "@/hooks/use-entry-validation";
import { PosterUploadSection } from "@/components/entry-dialogs/poster-upload-section";
import { SeriesTrackingSection } from "@/components/entry-dialogs/series-tracking-section";
import { RatingSection } from "@/components/entry-dialogs/rating-section";
import { MemberSelect } from "@/components/entry-dialogs/member-select";

interface Props {
    entry: WatchEntryDto;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, open, onOpenChange }: Props) {
    const { locale, t } = useLocale();
    const { user } = useAuth();
    const { activeGroup } = useGroup();
    const { permissions, isLoading: isPermissionsLoading } = usePermissions();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const canEdit = (permissions.canEditOwnEntries && (entry as Record<string, unknown>).userId == user?.id) || permissions.canEditAllEntries;
    const canRateSelf = permissions.canRateSelf;
    const canRateOthers = permissions.canRateOthers;
    const isRateOnlyMode = !canEdit && canRateSelf;

    const [status, setStatus] = useState<WatchStatus>(entry.status ?? WatchStatus.Planned);
    const myExistingRating = entry.ratings?.find((r) => r.userId === user?.id);
    const [myRating, setMyRating] = useState((myExistingRating?.rating ?? 0) / 2);
    const [selectedMembers, setSelectedMembers] = useState<number[]>(
        () => entry.ratings?.map((r) => r.userId!) ?? []
    );
    const [memberRatings, setMemberRatings] = useState<Record<number, number>>(
        () => {
            const map: Record<number, number> = {};
            entry.ratings?.forEach((r) => { map[r.userId!] = (r.rating ?? 0) / 2; });
            return map;
        }
    );
    const [comment, setComment] = useState(entry.comment || "");
    const [posterRemoved, setPosterRemoved] = useState(false);
    const [error, setError] = useState("");

    const [currentEpisode, setCurrentEpisode] = useState(entry.currentEpisode?.toString() || "");
    const [totalEpisodes, setTotalEpisodes] = useState(entry.totalEpisodes?.toString() || "");
    const [currentSeason, setCurrentSeason] = useState(entry.currentSeason?.toString() || "");

    const existingWatchingTime = entry.watchingTime || 0;
    const [hours, setHours] = useState(Math.floor(existingWatchingTime / 3600).toString());
    const [minutes, setMinutes] = useState(Math.floor((existingWatchingTime % 3600) / 60).toString());
    const [seconds, setSeconds] = useState((existingWatchingTime % 60).toString());

    const cropper = useImageCropper({
        initialPreview: getPosterUrl(entry.movie?.posterUrl),
        onPosterRemoved: () => setPosterRemoved(true),
    });

    const {
        validationErrors,
        setValidationErrors,
        handleFieldChange,
        validateAll,
        resetValidation,
    } = useEntryValidation();

    // Reset form state when entry changes or dialog opens
    useEffect(() => {
        if (open) {
            const myRat = entry.ratings?.find((r) => r.userId === user?.id);
            setStatus(entry.status ?? WatchStatus.Planned);
            setMyRating((myRat?.rating ?? 0) / 2);
            setSelectedMembers(entry.ratings?.map((r) => r.userId!) ?? []);
            const map: Record<number, number> = {};
            entry.ratings?.forEach((r) => { map[r.userId!] = (r.rating ?? 0) / 2; });
            setMemberRatings(map);
            setComment(entry.comment || "");
            setPosterRemoved(false);
            setError("");
            setCurrentEpisode(entry.currentEpisode?.toString() || "");
            setTotalEpisodes(entry.totalEpisodes?.toString() || "");
            setCurrentSeason(entry.currentSeason?.toString() || "");
            const wt = entry.watchingTime || 0;
            setHours(Math.floor(wt / 3600).toString());
            setMinutes(Math.floor((wt % 3600) / 60).toString());
            setSeconds((wt % 60).toString());
            cropper.resetCropper(getPosterUrl(entry.movie?.posterUrl));
            resetValidation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry]);

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);
    const queryClient = useQueryClient();

    // --- Change detection helpers ---
    const hasEntryFieldsChanged = useCallback((): boolean => {
        if (status !== entry.status) return true;
        if ((comment || "") !== (entry.comment || "")) return true;
        if (isGroupMode) {
            const origViewers = (entry.ratings?.map((r) => r.userId!) ?? []).slice().sort((a, b) => a - b);
            const curViewers = selectedMembers.slice().sort((a, b) => a - b);
            if (origViewers.length !== curViewers.length || origViewers.some((v, i) => v !== curViewers[i])) return true;
        }
        if (status === WatchStatus.Watching &&
            (entry.movie?.type === EntryContentType.Anime || entry.movie?.type === EntryContentType.Series || entry.movie?.type === EntryContentType.Cartoon)) {
            if ((currentSeason || "") !== (entry.currentSeason?.toString() || "")) return true;
            if ((currentEpisode || "") !== (entry.currentEpisode?.toString() || "")) return true;
            if ((totalEpisodes || "") !== (entry.totalEpisodes?.toString() || "")) return true;
            const newWt = (parseInt(hours || "0") * 3600 + parseInt(minutes || "0") * 60 + parseInt(seconds || "0"));
            if (newWt !== (entry.watchingTime || 0)) return true;
        }
        return false;
    }, [status, comment, isGroupMode, selectedMembers, currentSeason, currentEpisode, totalEpisodes, hours, minutes, seconds, entry]);

    const hasPosterChanged = (): boolean => {
        return !!cropper.posterFile || posterRemoved;
    };

    const hasRatingsChanged = useCallback((): boolean => {
        if (isGroupMode) {
            const origMap: Record<number, number> = {};
            entry.ratings?.forEach((r) => { origMap[r.userId!] = r.rating ?? 0; });
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
            const ratingsChanged = hasRatingsChanged();

            if (isRateOnlyMode) {
                if (ratingsChanged && user?.id) {
                    if (isGroupMode && canRateOthers) {
                        const origMap: Record<number, number> = {};
                        entry.ratings?.forEach((r) => { origMap[r.userId!] = r.rating ?? 0; });
                        for (const uid of selectedMembers) {
                            const newRating = Math.round((memberRatings[uid] ?? 0) * 2);
                            const origRating = origMap[uid] ?? 0;
                            if (newRating !== origRating) {
                                await rateEntry(entry.id!, newRating, uid);
                            }
                        }
                    } else {
                        const currentRating = isGroupMode ? (memberRatings[user.id] ?? 0) : myRating;
                        await rateEntry(entry.id!, Math.round(currentRating * 2));
                    }
                }
                return;
            }

            const entryChanged = hasEntryFieldsChanged();
            const posterChanged = hasPosterChanged();
            const fileToUpload = overridePosterFile ?? cropper.posterFile;

            if (!entryChanged && !posterChanged && !ratingsChanged) return;

            if (fileToUpload) {
                const posterUrl = await uploadPoster(fileToUpload);
                await updateMovie(entry.movieId!, { posterUrl });
            } else if (posterRemoved) {
                await updateMovie(entry.movieId!, { posterUrl: "" });
            }

            if (entryChanged) {
                await updateWatchEntry(entry.id!, {
                    status,
                    comment: comment || undefined,
                    ...(status === WatchStatus.Watching && (
                        entry.movie?.type === EntryContentType.Anime ||
                        entry.movie?.type === EntryContentType.Series ||
                        entry.movie?.type === EntryContentType.Cartoon
                    ) ? {
                        currentSeason: currentSeason ? parseInt(currentSeason) : undefined,
                        currentEpisode: currentEpisode ? parseInt(currentEpisode) : undefined,
                        totalEpisodes: totalEpisodes ? parseInt(totalEpisodes) : undefined,
                        watchingTime: (hours || minutes || seconds)
                            ? (parseInt(hours || "0") * 3600 + parseInt(minutes || "0") * 60 + parseInt(seconds || "0"))
                            : undefined,
                    } : {}),
                });
            }

            if (ratingsChanged && (status === WatchStatus.Completed || status === WatchStatus.Dropped) && user?.id) {
                if (isGroupMode && canRateOthers) {
                    const origMap: Record<number, number> = {};
                    entry.ratings?.forEach((r) => { origMap[r.userId!] = r.rating ?? 0; });
                    for (const uid of selectedMembers) {
                        const newRating = Math.round((memberRatings[uid] ?? 0) * 2);
                        const origRating = origMap[uid] ?? 0;
                        if (newRating !== origRating) {
                            await rateEntry(entry.id!, newRating, uid);
                        }
                    }
                } else {
                    const currentRating = isGroupMode ? (memberRatings[user.id] ?? 0) : myRating;
                    await rateEntry(entry.id!, Math.round(currentRating * 2));
                }
            }
        },
        onSuccess: () => {
            toast.success(isRateOnlyMode ? t("ratingUpdated") : t("postUpdated"), { position: "top-center" });
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const err = error as Record<string, Record<string, Record<string, string>>>;
            const errorMessage = err?.response?.data?.message || (isRateOnlyMode ? t("failedToRate") : t("failedToUpdate"));
            toast.error(errorMessage, { position: "top-center" });
            setError(isRateOnlyMode ? t("failedToRate") : t("failedToUpdate"));
        },
    });

    const handleToggleMember = (userId: number) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers((prev) => prev.filter((id) => id !== userId));
            setMemberRatings((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        } else {
            setSelectedMembers((prev) => [...prev, userId]);
        }
    };

    const handleMemberRatingChange = (uid: number, value: number) => {
        setMemberRatings((prev) => ({ ...prev, [uid]: value }));
        const key = `memberRating_${uid}`;
        setValidationErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleRateOnlyMemberRatingChange = (uid: number, value: number) => {
        setMemberRatings((prev) => ({ ...prev, [uid]: value }));
        if (!selectedMembers.includes(uid)) {
            setSelectedMembers((prev) => [...prev, uid]);
        }
    };

    const handleRateOnlySelfRatingChange = (value: number) => {
        if (isGroupMode && user?.id) {
            setMemberRatings((prev) => ({ ...prev, [user.id!]: value }));
            if (!selectedMembers.includes(user.id!)) {
                setSelectedMembers((prev) => [...prev, user.id!]);
            }
        } else {
            setMyRating(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChanges) return;

        const errors = validateAll([
            { name: "comment", value: comment },
            { name: "currentSeason", value: currentSeason },
            { name: "currentEpisode", value: currentEpisode },
            { name: "totalEpisodes", value: totalEpisodes },
            { name: "hours", value: hours },
            { name: "minutes", value: minutes },
            { name: "seconds", value: seconds },
        ]);

        if (isGroupMode && (status === WatchStatus.Completed || status === WatchStatus.Dropped)) {
            selectedMembers.forEach(uid => {
                const rating = memberRatings[uid] || 0;
                if (rating && (rating < 1 || rating > 10)) {
                    errors[`memberRating_${uid}`] = t("invalidRating");
                }
            });
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setError(t("fixValidationErrors"));
            return;
        }

        setError("");

        let croppedFile: File | null = null;
        if (cropper.isCropping && cropper.editorImageSrc) {
            try {
                croppedFile = await cropper.applyCropAndGetFile();
            } catch {
                toast.error(t("cropFailed"), { position: "top-center" });
                return;
            }
        }

        mutation.mutate(croppedFile);
    };

    const showTracking = status === WatchStatus.Watching && (
        entry.movie?.type === EntryContentType.Anime ||
        entry.movie?.type === EntryContentType.Series ||
        entry.movie?.type === EntryContentType.Cartoon
    );

    const showRating = status === WatchStatus.Completed || status === WatchStatus.Dropped;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isRateOnlyMode ? (
                            <>
                                <Star className="h-5 w-5" />
                                {t("rateOnlyTitle")}
                            </>
                        ) : (
                            <>
                                <Pencil className="h-5 w-5" />
                                {t("editEntry")}
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-muted p-3 rounded-lg mb-4 flex items-center gap-3">
                    <Film className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                        <h3 className="font-semibold">{entry.movie?.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {contentTypeLabels[entry.movie!.type! as EntryContentType]}
                            {entry.movie?.year && (
                                <>
                                    <Calendar className="h-3 w-3 ml-1" />
                                    {entry.movie?.year}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {isPermissionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : isRateOnlyMode ? (
                    /* Rate-only form */
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-muted-foreground">{t("rateOnlyDescription")}</p>

                        <Field>
                            <FieldLabel className="flex items-center gap-1.5">
                                <ListChecks className="h-3.5 w-3.5" />
                                {t("status")}
                            </FieldLabel>
                            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                                {watchStatusLabels[status]}
                            </div>
                        </Field>

                        {entry.comment && (
                            <Field>
                                <FieldLabel className="flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5" />
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
                                    <Star className="h-3.5 w-3.5" />
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
                                                    {Array.from({ length: 10 }, (_, i) => (
                                                        <RatingItem key={i} />
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
                                    <Star className="h-3.5 w-3.5" />
                                    {t("myRatingLabel")}
                                </FieldLabel>
                                <div className="flex items-center gap-4">
                                    <Rating
                                        value={isGroupMode ? (memberRatings[user?.id ?? 0] || 0) : myRating}
                                        onValueChange={handleRateOnlySelfRatingChange}
                                        max={10}
                                        step={0.5}
                                        clearable
                                    >
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <RatingItem key={i} />
                                        ))}
                                    </Rating>
                                    <div className="opacity-50">
                                        {isGroupMode ? (memberRatings[user?.id ?? 0] || 0) : myRating}/10
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
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <PosterUploadSection
                            cropper={cropper}
                            fileInputRef={cropper.fileInputRef}
                            onFileChange={cropper.handleFileChange}
                            gridSwitchId="edit-crop-grid"
                            canReCropFromPreview
                            showPasteInPreview
                        />

                        <FieldGroup className="gap-4">
                            <Field>
                                <FieldLabel className="flex items-center gap-1.5">
                                    <ListChecks className="h-3.5 w-3.5" />
                                    {t("status")}
                                </FieldLabel>
                                <Select
                                    value={status}
                                    onValueChange={(v) => setStatus(v as WatchStatus)}
                                    disabled={!canEdit}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(watchStatusLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
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
                                        canRateOthers={canRateOthers}
                                        canRateSelf={canRateSelf}
                                        currentUserId={user?.id}
                                    />
                                )}

                                {showTracking && (
                                    <SeriesTrackingSection
                                        currentSeason={currentSeason}
                                        setCurrentSeason={setCurrentSeason}
                                        currentEpisode={currentEpisode}
                                        setCurrentEpisode={setCurrentEpisode}
                                        totalEpisodes={totalEpisodes}
                                        setTotalEpisodes={setTotalEpisodes}
                                        hours={hours}
                                        setHours={setHours}
                                        minutes={minutes}
                                        setMinutes={setMinutes}
                                        seconds={seconds}
                                        setSeconds={setSeconds}
                                        handleFieldChange={handleFieldChange}
                                        validationErrors={validationErrors}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {status !== WatchStatus.Planned && status !== WatchStatus.Watching && (
                                    <RatingSection
                                        isGroupMode={false}
                                        members={[]}
                                        selectedMembers={[]}
                                        memberRatings={{}}
                                        onMemberRatingChange={() => {}}
                                        myRating={myRating}
                                        onMyRatingChange={setMyRating}
                                        canRateOthers={false}
                                        canRateSelf
                                        currentUserId={user?.id}
                                    />
                                )}
                            </>
                        )}

                        <FieldGroup className="gap-4">
                            <Field>
                                <FieldContent>
                                    <FieldLabel htmlFor="comment" className="flex items-center gap-1.5">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {t("comment")}
                                    </FieldLabel>
                                    <FieldDescription>{t("commentDescription")}</FieldDescription>
                                </FieldContent>
                                <Textarea
                                    id="comment"
                                    value={comment}
                                    disabled={!canEdit}
                                    onChange={(e) => {
                                        setComment(e.target.value);
                                        handleFieldChange("comment", e.target.value);
                                    }}
                                    rows={3}
                                    placeholder={t("commentPlaceholder")}
                                    aria-invalid={!!validationErrors.comment}
                                />
                                {validationErrors.comment && <FieldError>{validationErrors.comment}</FieldError>}
                            </Field>
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
                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                        {t("saving")}
                                    </>
                                ) : (
                                    t("save")
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
