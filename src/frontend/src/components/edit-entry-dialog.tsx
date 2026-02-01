"use client";

import {useState, useRef, useEffect} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {updateWatchEntry, updateMovie, uploadPoster, getPosterUrl} from "@/lib/api";
import {useLocale} from "@/context/locale-context";
import {useAuth} from "@/context/auth-context";
import {useGroup} from "@/context/group-context";
import {ContentType, WatchEntry} from "@/types";
import {
    WatchStatus,
    Emotion,
    EmotionEmojis,
} from "@/types";
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
    ImagePlus,
    X,
    ListChecks,
    Users,
    Star,
    MessageSquare,
    Loader2,
    Film,
    Calendar,
    ClipboardPaste,
} from "lucide-react";
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

interface Props {
    entry: WatchEntry;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({entry, open, onOpenChange}: Props) {
    const {locale, t} = useLocale();
    const {user} = useAuth();
    const {activeGroup} = useGroup();
    const isGroupMode = !!entry.groupId && !!activeGroup;

    const [status, setStatus] = useState<WatchStatus>(entry.status);
    // Personal mode: single rating
    const myExistingRating = entry.ratings?.find((r) => r.userId === user?.id);
    const [myRating, setMyRating] = useState(myExistingRating?.rating?.toString() || "");
    // Group mode: selected members and per-member ratings
    const [selectedMembers, setSelectedMembers] = useState<number[]>(
        () => entry.ratings?.map((r) => r.userId) ?? []
    );
    const [memberRatings, setMemberRatings] = useState<Record<number, string>>(
        () => {
            const map: Record<number, string> = {};
            entry.ratings?.forEach((r) => {
                map[r.userId] = r.rating.toString();
            });
            return map;
        }
    );
    const [emotion, setEmotion] = useState<Emotion | null>(entry.emotion ?? null);
    const [comment, setComment] = useState(entry.comment || "");
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(
        getPosterUrl(entry.movie.posterUrl)
    );
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentEpisode, setCurrentEpisode] = useState(entry.currentEpisode?.toString() || "");
    const [totalEpisodes, setTotalEpisodes] = useState(entry.totalEpisodes?.toString() || "");
    const [currentSeason, setCurrentSeason] = useState(entry.currentSeason?.toString() || "");

    const existingWatchingTime = entry.watchingTime || 0;
    const [hours, setHours] = useState(Math.floor(existingWatchingTime / 3600).toString());
    const [minutes, setMinutes] = useState(Math.floor((existingWatchingTime % 3600) / 60).toString());
    const [seconds, setSeconds] = useState((existingWatchingTime % 60).toString());

    // Validation errors
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

    const validateField = (name: string, value: string): string | null => {
        switch (name) {
            case "year":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1900 || parseInt(value) > 2100)) {
                    return t("invalidYear");
                }
                return null;
            case "comment":
                if (value.length > 1000) return t("commentTooLong");
                return null;
            case "currentSeason":
            case "currentEpisode":
            case "totalEpisodes":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1)) {
                    return t("invalidNumber");
                }
                return null;
            case "hours":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 0)) {
                    return t("invalidNumber");
                }
                return null;
            case "minutes":
            case "seconds":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 0 || parseInt(value) > 59)) {
                    return t("invalidTimeComponent");
                }
                return null;
            case "myRating":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1 || parseInt(value) > 10)) {
                    return t("invalidRating");
                }
                return null;
            default:
                return null;
        }
    };

    const handleFieldChange = (name: string, value: string) => {
        // Clear previous timeout for this field
        if (validationTimeouts.current[name]) {
            clearTimeout(validationTimeouts.current[name]);
        }

        // Clear error immediately when user starts typing
        setValidationErrors(prev => {
            const next = {...prev};
            delete next[name];
            return next;
        });

        // Set new timeout for validation (500ms after user stops typing)
        validationTimeouts.current[name] = setTimeout(() => {
            const error = validateField(name, value);
            setValidationErrors(prev => {
                const next = {...prev};
                if (error) {
                    next[name] = error;
                } else {
                    delete next[name];
                }
                return next;
            });
        }, 500);
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(validationTimeouts.current).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            if (posterFile) {
                const posterUrl = await uploadPoster(posterFile);
                await updateMovie(entry.movieId, {posterUrl});
            }

            const ratingsArray = isGroupMode
                ? selectedMembers
                    .filter((uid) => memberRatings[uid])
                    .map((uid) => ({userId: uid, rating: parseInt(memberRatings[uid])}))
                : undefined;

            await updateWatchEntry(entry.id, {
                status,
                rating: !isGroupMode && myRating ? parseInt(myRating) : undefined,
                ratings: ratingsArray,
                viewers: isGroupMode ? selectedMembers : undefined,
                emotion: emotion ?? undefined,
                comment: comment || undefined,
                // Series/Anime tracking
                ...(status === WatchStatus.Watching && (
                    (entry.movie.type === ContentType.Anime ||
                        entry.movie.type === ContentType.Series ||
                        entry.movie.type === ContentType.Cartoon)
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
            toast.success(t("postUpdated"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            onOpenChange(false);
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || t("failedToUpdate");
            toast.error(errorMessage, { position: "top-center" })
            setError(t("failedToUpdate"));
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
    };

    const setImageFile = (file: File) => {
        setPosterFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPosterPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handlePasteFromClipboard = async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find((t) => t.startsWith("image/"));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const ext = imageType.split("/")[1] || "png";
                    const file = new File([blob], `clipboard.${ext}`, {type: imageType});
                    setImageFile(file);
                    return;
                }
            }
            setError(t("clipboardNoImage"));
        } catch {
            setError(t("clipboardFailed"));
        }
    };

    const removePoster = () => {
        setPosterFile(null);
        setPosterPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const errors: Record<string, string> = {};
        const fieldsToValidate = [
            { name: "comment", value: comment },
            { name: "currentSeason", value: currentSeason },
            { name: "currentEpisode", value: currentEpisode },
            { name: "totalEpisodes", value: totalEpisodes },
            { name: "hours", value: hours },
            { name: "minutes", value: minutes },
            { name: "seconds", value: seconds },
            { name: "myRating", value: myRating },
        ];

        fieldsToValidate.forEach(({ name, value }) => {
            const error = validateField(name, value);
            if (error) {
                errors[name] = error;
            }
        });

        // Validate member ratings
        if (isGroupMode && (status === WatchStatus.Completed || status === WatchStatus.Dropped)) {
            selectedMembers.forEach(uid => {
                const rating = memberRatings[uid] || "";
                if (rating && (!/^\d+$/.test(rating) || parseInt(rating) < 1 || parseInt(rating) > 10)) {
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
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5"/>
                        {t("editEntry")}
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-muted p-3 rounded-lg mb-4 flex items-center gap-3">
                    <Film className="h-5 w-5 text-muted-foreground shrink-0"/>
                    <div>
                        <h3 className="font-semibold">{entry.movie.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {contentTypeLabels[entry.movie.type]}
                            {entry.movie.year && (
                                <>
                                    <Calendar className="h-3 w-3 ml-1"/>
                                    {entry.movie.year}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Poster */}
                    <Field>
                        <FieldContent>
                            <FieldLabel className="flex items-center gap-1.5">
                                <ImagePlus className="h-4 w-4"/>
                                {t("poster")}
                            </FieldLabel>
                            <FieldDescription>
                                {t("posterDescription")}
                            </FieldDescription>
                        </FieldContent>
                        {posterPreview ? (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                <img
                                    src={posterPreview}
                                    alt="Poster preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Pencil className="h-3.5 w-3.5"/>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={handlePasteFromClipboard}
                                    >
                                        <ClipboardPaste className="h-3.5 w-3.5"/>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={removePoster}
                                    >
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center flex-1 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors text-muted-foreground"
                                >
                                    <ImagePlus className="h-8 w-8 mb-2"/>
                                    <span className="text-sm">{t("clickToUpload")}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePasteFromClipboard}
                                    className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors text-muted-foreground"
                                >
                                    <ClipboardPaste className="h-8 w-8 mb-2"/>
                                    <span className="text-xs text-center px-1">{t("pasteFromClipboard")}</span>
                                </button>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </Field>

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel className="flex items-center gap-1.5">
                                <ListChecks className="h-3.5 w-3.5"/>
                                {t("status")}
                            </FieldLabel>
                            <Select
                                value={status.toString()}
                                onValueChange={(v) => setStatus(Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(watchStatusLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>

                    {isGroupMode ? (
                        <>
                            {/* Group mode: member multi-select */}
                            <Field>
                                <FieldContent>
                                    <FieldLabel className="flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5"/>
                                        {t("viewers")}
                                    </FieldLabel>
                                    <FieldDescription>
                                        {t("membersDescription")}
                                    </FieldDescription>
                                </FieldContent>
                                <div className="flex flex-wrap gap-2">
                                    {activeGroup.members.map((m) => {
                                        const selected = selectedMembers.includes(m.userId);
                                        return (
                                            <Button
                                                key={m.userId}
                                                type="button"
                                                variant={selected ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    if (selected) {
                                                        setSelectedMembers((prev) => prev.filter((id) => id !== m.userId));
                                                        setMemberRatings((prev) => {
                                                            const next = {...prev};
                                                            delete next[m.userId];
                                                            return next;
                                                        });
                                                    } else {
                                                        setSelectedMembers((prev) => [...prev, m.userId]);
                                                    }
                                                }}
                                            >
                                                {m.displayName}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Field>

                            {/* Per-member rating fields */}
                            {(status === WatchStatus.Completed || status === WatchStatus.Dropped) &&
                                selectedMembers.length > 0 && (
                                    <FieldSet>
                                        <FieldLegend variant="label" className="flex items-center gap-1.5">
                                            <Star className="h-3.5 w-3.5"/>
                                            {t("ratings")}
                                        </FieldLegend>
                                        <FieldGroup className="gap-4">
                                            {selectedMembers.map((uid) => {
                                                const member = activeGroup.members.find((m) => m.userId === uid);
                                                if (!member) return null;
                                                return (
                                                    <Field key={uid} orientation="horizontal">
                                                        <FieldLabel className="flex items-center gap-1.5 min-w-0 shrink-0">
                                                            {member.displayName}
                                                        </FieldLabel>
                                                        <div>
                                                            <Input
                                                                value={memberRatings[uid] || ""}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    setMemberRatings((prev) => ({...prev, [uid]: v}));

                                                                    // Clear previous timeout
                                                                    const key = `memberRating_${uid}`;
                                                                    if (validationTimeouts.current[key]) {
                                                                        clearTimeout(validationTimeouts.current[key]);
                                                                    }

                                                                    // Clear error immediately
                                                                    setValidationErrors(prev => {
                                                                        const next = {...prev};
                                                                        delete next[key];
                                                                        return next;
                                                                    });

                                                                    // Set timeout for validation
                                                                    if (v) {
                                                                        validationTimeouts.current[key] = setTimeout(() => {
                                                                            const error = validateField("myRating", v);
                                                                            setValidationErrors(prev => {
                                                                                const next = {...prev};
                                                                                if (error) {
                                                                                    next[key] = error;
                                                                                } else {
                                                                                    delete next[key];
                                                                                }
                                                                                return next;
                                                                            });
                                                                        }, 500);
                                                                    }
                                                                }}
                                                                placeholder="1-10"
                                                                className="w-32 h-8"
                                                                aria-invalid={!!validationErrors[`memberRating_${uid}`]}
                                                            />
                                                            {validationErrors[`memberRating_${uid}`] && (
                                                                <FieldError className="text-xs">{validationErrors[`memberRating_${uid}`]}</FieldError>
                                                            )}
                                                        </div>
                                                    </Field>
                                                );
                                            })}
                                        </FieldGroup>
                                    </FieldSet>
                                )}

                            {status === WatchStatus.Watching && (
                                entry.movie.type === ContentType.Anime ||
                                entry.movie.type === ContentType.Series ||
                                entry.movie.type === ContentType.Cartoon) && (
                                <FieldSet>
                                    <FieldLegend variant="label">
                                        {t("trackingInfo")}
                                    </FieldLegend>
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
                                </FieldSet>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Personal mode: single rating */}
                            {status !== WatchStatus.Planned && status !== WatchStatus.Watching && (
                                <Field>
                                    <FieldLabel htmlFor="myRating" className="flex items-center gap-1.5">
                                        <Star className="h-3.5 w-3.5"/>
                                        {t("myRatingLabel")}
                                    </FieldLabel>
                                    <Input
                                        id="myRating"
                                        value={myRating}
                                        onChange={(e) => {
                                            setMyRating(e.target.value);
                                            handleFieldChange("myRating", e.target.value);
                                        }}
                                        placeholder="1-10"
                                        aria-invalid={!!validationErrors.myRating}
                                    />
                                    {validationErrors.myRating && <FieldError>{validationErrors.myRating}</FieldError>}
                                </Field>
                            )}
                        </>
                    )}

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldContent>
                                <FieldLabel>{t("emotion")}</FieldLabel>
                                <FieldDescription>
                                    {t("emotionDescription")}
                                </FieldDescription>
                            </FieldContent>
                            <div className="flex flex-wrap gap-2">
                            {Object.entries(EmotionEmojis).map(([value, emoji]) => (
                                <Button
                                    key={value}
                                    type="button"
                                    variant={emotion === Number(value) ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEmotion(Number(value) as Emotion)}
                                    className="text-xl px-3"
                                >
                                    {emoji}
                                </Button>
                            ))}
                            {emotion !== null && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEmotion(null)}
                                >
                                    <X className="h-4 w-4 mr-1"/>
                                    {t("clear")}
                                </Button>
                            )}
                            </div>
                        </Field>

                        <Field>
                            <FieldContent>
                                <FieldLabel htmlFor="comment" className="flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5"/>
                                    {t("comment")}
                                </FieldLabel>
                                <FieldDescription>
                                    {t("commentDescription")}
                                </FieldDescription>
                            </FieldContent>
                            <Textarea
                                id="comment"
                                value={comment}
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
                            disabled={mutation.isPending}
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
            </DialogContent>
        </Dialog>
    );
}
