"use client";

import { toast } from "sonner";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMovie, createWatchEntry, uploadPoster } from "@/lib/api";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import {
    EntryContentType,
    WatchStatus,
    GroupType,
} from "@/lib/api.generated";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GenreMultiSelect } from "@/components/genre-multi-select";
import {
    Type,
    Calendar,
    Film,
    Tag,
    FileText,
    ListChecks,
    MessageSquare,
    Loader2,
} from "lucide-react";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldContent,
    FieldGroup,
} from "@/components/ui/field";
import { usePermissions } from "@/context/permissions-context";
import { useAuth } from "@/context/auth-context";
import { useImageCropper } from "@/hooks/use-image-cropper";
import { useEntryValidation } from "@/hooks/use-entry-validation";
import { PosterUploadSection } from "@/components/entry-dialogs/poster-upload-section";
import { SeriesTrackingSection } from "@/components/entry-dialogs/series-tracking-section";
import { RatingSection } from "@/components/entry-dialogs/rating-section";
import { MemberSelect } from "@/components/entry-dialogs/member-select";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({ open, onOpenChange }: Props) {
    const { locale, t } = useLocale();
    const { activeGroupId, activeGroup } = useGroup();
    const { permissions } = usePermissions();
    const { user: currentUser } = useAuth();

    const canRateOthers = permissions.canRateOthers;
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<EntryContentType>(EntryContentType.Movie);
    const [year, setYear] = useState("");
    const [genre, setGenre] = useState("");
    const [status, setStatus] = useState<WatchStatus>(WatchStatus.Planned);
    const [myRating, setMyRating] = useState(0);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [memberRatings, setMemberRatings] = useState<Record<number, number>>({});
    const [comment, setComment] = useState("");
    const [error, setError] = useState("");

    const [currentEpisode, setCurrentEpisode] = useState("");
    const [totalEpisodes, setTotalEpisodes] = useState("");
    const [currentSeason, setCurrentSeason] = useState("");
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [seconds, setSeconds] = useState("");

    const cropper = useImageCropper();

    const extraValidators = useMemo(() => ({
        title: (value: string) => {
            if (!value.trim()) return t("titleRequired");
            if (value.length > 255) return t("titleTooLong");
            return null;
        },
        description: (value: string) => {
            if (value.length > 1000) return t("descriptionTooLong");
            return null;
        },
    }), [t]);

    const {
        validationErrors,
        setValidationErrors,
        handleFieldChange,
        validateAll,
        resetValidation,
    } = useEntryValidation({ extraValidators });

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);
    const queryClient = useQueryClient();

    const resetForm = useCallback(() => {
        setTitle("");
        setDescription("");
        setType(EntryContentType.Movie);
        setYear("");
        setGenre("");
        setStatus(WatchStatus.Planned);
        setMyRating(0);
        setSelectedMembers([]);
        setMemberRatings({});
        setComment("");
        setError("");
        setCurrentEpisode("");
        setTotalEpisodes("");
        setCurrentSeason("");
        setHours("");
        setMinutes("");
        setSeconds("");
        cropper.resetCropper();
        resetValidation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (open) resetForm();
    }, [open, resetForm]);

    const mutation = useMutation({
        mutationFn: async (overridePosterFile?: File | null) => {
            const fileToUpload = overridePosterFile ?? cropper.posterFile;
            let posterUrl: string | undefined;
            if (fileToUpload) {
                posterUrl = await uploadPoster(fileToUpload);
            }

            const movie = await createMovie({
                title,
                description: description || undefined,
                type,
                year: year ? parseInt(year) : undefined,
                genre: genre || undefined,
                posterUrl,
            });

            const ratingsArray = isGroupMode
                ? selectedMembers
                    .filter((uid) => memberRatings[uid])
                    .map((uid) => ({ userId: uid, rating: memberRatings[uid] * 2 }))
                : undefined;

            await createWatchEntry({
                movieId: movie.id!,
                status,
                rating: !isGroupMode && myRating ? myRating * 2 : undefined,
                ratings: ratingsArray,
                viewers: isGroupMode ? selectedMembers : undefined,
                comment: comment || undefined,
                groupId: activeGroupId,
                ...(status === WatchStatus.Watching && (
                    type === EntryContentType.Anime ||
                    type === EntryContentType.Series ||
                    type === EntryContentType.Cartoon
                ) ? {
                    currentSeason: currentSeason ? parseInt(currentSeason) : undefined,
                    currentEpisode: currentEpisode ? parseInt(currentEpisode) : undefined,
                    totalEpisodes: totalEpisodes ? parseInt(totalEpisodes) : undefined,
                    watchingTime: (hours || minutes || seconds)
                        ? (parseInt(hours || "0") * 3600 + parseInt(minutes || "0") * 60 + parseInt(seconds || "0"))
                        : undefined,
                } : {}),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            toast.success(t("postAdded"), { position: "top-center" });
            resetForm();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const err = error as Record<string, Record<string, Record<string, string>>>;
            const errorMessage = err?.response?.data?.message || t("failedToAdd");
            toast.error(errorMessage, { position: "top-center" });
            setError(errorMessage);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateAll([
            { name: "title", value: title },
            { name: "year", value: year },
            { name: "description", value: description },
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
        type === EntryContentType.Anime ||
        type === EntryContentType.Series ||
        type === EntryContentType.Cartoon
    );

    const showRating = status === WatchStatus.Completed || status === WatchStatus.Dropped;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5" />
                        {t("addNewEntry")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <PosterUploadSection
                        cropper={cropper}
                        fileInputRef={cropper.fileInputRef}
                        onFileChange={cropper.handleFileChange}
                        gridSwitchId="add-crop-grid"
                    />

                    <FieldGroup>
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="title" className="flex items-center gap-1.5">
                                    <Type className="h-3.5 w-3.5" />
                                    {t("title")} *
                                </FieldLabel>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => {
                                        setTitle(e.target.value);
                                        handleFieldChange("title", e.target.value);
                                    }}
                                    required
                                    autoFocus
                                    aria-invalid={!!validationErrors.title}
                                />
                                {validationErrors.title && <FieldError>{validationErrors.title}</FieldError>}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="year" className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {t("year")}
                                </FieldLabel>
                                <Input
                                    id="year"
                                    value={year}
                                    onChange={(e) => {
                                        setYear(e.target.value);
                                        handleFieldChange("year", e.target.value);
                                    }}
                                    placeholder="2024"
                                    aria-invalid={!!validationErrors.year}
                                />
                                {validationErrors.year && <FieldError>{validationErrors.year}</FieldError>}
                            </Field>
                        </div>
                    </FieldGroup>

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel className="flex items-center gap-1.5">
                                <Film className="h-3.5 w-3.5" />
                                {t("type")}
                            </FieldLabel>
                            <Select value={type} onValueChange={(v) => setType(v as EntryContentType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(contentTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field>
                            <FieldContent>
                                <FieldLabel className="flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5" />
                                    {t("genre")}
                                </FieldLabel>
                                <FieldDescription>{t("genreDescription")}</FieldDescription>
                            </FieldContent>
                            <GenreMultiSelect value={genre} onChange={setGenre} />
                        </Field>
                    </FieldGroup>

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="description" className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                {t("description")}
                            </FieldLabel>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    handleFieldChange("description", e.target.value);
                                }}
                                rows={2}
                                aria-invalid={!!validationErrors.description}
                            />
                            {validationErrors.description && <FieldError>{validationErrors.description}</FieldError>}
                        </Field>

                        <Field>
                            <FieldLabel className="flex items-center gap-1.5">
                                <ListChecks className="h-3.5 w-3.5" />
                                {t("status")}
                            </FieldLabel>
                            <Select value={status} onValueChange={(v) => setStatus(v as WatchStatus)}>
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
                                members={activeGroup.members ?? []}
                                selectedMembers={selectedMembers}
                                onToggleMember={handleToggleMember}
                            />

                            {showRating && selectedMembers.length > 0 && (
                                <RatingSection
                                    isGroupMode
                                    members={activeGroup.members ?? []}
                                    selectedMembers={selectedMembers}
                                    memberRatings={memberRatings}
                                    onMemberRatingChange={handleMemberRatingChange}
                                    myRating={myRating}
                                    onMyRatingChange={setMyRating}
                                    canRateOthers={canRateOthers}
                                    canRateSelf
                                    currentUserId={currentUser?.id}
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
                            {showRating && (
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
                                    currentUserId={currentUser?.id}
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
                                    wrapped={false}
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
                                onChange={(e) => {
                                    setComment(e.target.value);
                                    handleFieldChange("comment", e.target.value);
                                }}
                                rows={2}
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
                            disabled={mutation.isPending}
                            className="flex-1"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                    {t("adding")}
                                </>
                            ) : (
                                t("add")
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
