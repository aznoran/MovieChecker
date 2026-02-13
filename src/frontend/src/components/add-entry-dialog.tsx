"use client";

import { toast } from "sonner"
import {useState, useRef, useEffect, useCallback} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createMovie, createWatchEntry, uploadPoster} from "@/lib/api";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {useAuth} from "@/context/auth-context";
import {
    Cropper,
    CropperImage,
    CropperArea,
    type CropperAreaData,
} from "@/components/ui/cropper";
import {getCroppedImage} from "@/lib/crop-utils";
import {
    ContentType,
    WatchStatus,
    Emotion,
    EmotionEmojis,
    GroupType,
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
import {GenreMultiSelect} from "@/components/genre-multi-select";
import {
    ImagePlus,
    X,
    Type,
    Calendar,
    Film,
    Tag,
    FileText,
    ListChecks,
    Users,
    Star,
    MessageSquare,
    Loader2,
    ClipboardPaste,
    Crop,
    ZoomIn,
    RotateCw,
    RotateCcw,
} from "lucide-react";
import * as React from "react";
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
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({open, onOpenChange}: Props) {
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup} = useGroup();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<ContentType>(ContentType.Movie);
    const [year, setYear] = useState("");
    const [genre, setGenre] = useState("");
    const [status, setStatus] = useState<WatchStatus>(WatchStatus.Planned);
    const [myRating, setMyRating] = useState("");
    // Group mode: selected member IDs and per-member ratings
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
    const [memberRatings, setMemberRatings] = useState<Record<number, string>>({});
    const [emotion, setEmotion] = useState<Emotion | null>(null);
    const [comment, setComment] = useState("");
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);
    const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({x: 0, y: 0});
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [withGrid, setWithGrid] = useState(false);
    const croppedAreaPixelsRef = useRef<CropperAreaData | null>(null);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New states for series/anime/cartoon tracking
    const [currentEpisode, setCurrentEpisode] = useState("");
    const [totalEpisodes, setTotalEpisodes] = useState("");
    const [currentSeason, setCurrentSeason] = useState("");
    const [hours, setHours] = useState("");
    const [minutes, setMinutes] = useState("");
    const [seconds, setSeconds] = useState("");

    // Validation errors
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

    const validateField = (name: string, value: string): string | null => {
        switch (name) {
            case "title":
                if (!value.trim()) return t("titleRequired");
                if (value.length > 255) return t("titleTooLong");
                return null;
            case "year":
                if (value && (!/^\d+$/.test(value) || parseInt(value) < 1900 || parseInt(value) > 2100)) {
                    return t("invalidYear");
                }
                return null;
            case "description":
                if (value.length > 1000) return t("descriptionTooLong");
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
        mutationFn: async (overridePosterFile?: File | null) => {
            const fileToUpload = overridePosterFile ?? posterFile;
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
                    .map((uid) => ({userId: uid, rating: parseInt(memberRatings[uid])}))
                : undefined;

            await createWatchEntry({
                movieId: movie.id,
                status,
                rating: !isGroupMode && myRating ? parseInt(myRating) : undefined,
                ratings: ratingsArray,
                viewers: isGroupMode ? selectedMembers : undefined,
                emotion: (status === WatchStatus.Completed || status === WatchStatus.Dropped) ? (emotion ?? undefined) : undefined,
                comment: comment || undefined,
                groupId: activeGroupId,
                // Series/Anime tracking
                ...(status === WatchStatus.Watching && (
                    (type === ContentType.Anime ||
                        type === ContentType.Series ||
                        type === ContentType.Cartoon)
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
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            toast.success(t("postAdded"), { position: "top-center" })
            resetForm();
            onOpenChange(false);
        },
        onError: (error: any) => {
            // Extract error message from response if available
            const errorMessage = error?.response?.data?.message || t("failedToAdd");
            toast.error(errorMessage, { position: "top-center" })
            setError(errorMessage);
        },
    });

    const onCropReset = useCallback(() => {
        setCrop({x: 0, y: 0});
        setZoom(1);
        setRotation(0);
    }, []);

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setType(ContentType.Movie);
        setYear("");
        setGenre("");
        setStatus(WatchStatus.Planned);
        setMyRating("");
        setSelectedMembers([]);
        setMemberRatings({});
        setEmotion(null);
        setComment("");
        setPosterFile(null);
        setPosterPreview(null);
        setEditorImageSrc(null);
        setIsCropping(false);
        onCropReset();
        croppedAreaPixelsRef.current = null;
        setError("");
        setCurrentEpisode("");
        setTotalEpisodes("");
        setCurrentSeason("");
        setHours("");
        setMinutes("");
        setSeconds("");
        setValidationErrors({});
    };

    useEffect(() => {
        if (open) resetForm();
    }, [open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        startCropping(file);
    };

    const startCropping = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditorImageSrc(reader.result as string);
            onCropReset();
            croppedAreaPixelsRef.current = null;
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const onCropComplete = useCallback((_: CropperAreaData, croppedPixels: CropperAreaData) => {
        croppedAreaPixelsRef.current = croppedPixels;
    }, []);

    const applyCropAndGetFile = async (): Promise<File | null> => {
        if (!editorImageSrc) return null;
        let file: File;
        if (croppedAreaPixelsRef.current) {
            const blob = await getCroppedImage(editorImageSrc, croppedAreaPixelsRef.current, rotation);
            file = new File([blob], "cropped-poster.jpg", {type: "image/jpeg"});
        } else {
            // User never interacted with the cropper — use original image as-is
            const res = await fetch(editorImageSrc);
            const blob = await res.blob();
            file = new File([blob], "poster.jpg", {type: blob.type || "image/jpeg"});
        }
        setPosterFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPosterPreview(reader.result as string);
        reader.readAsDataURL(file);
        setIsCropping(false);
        return file;
    };

    const handleApplyCrop = async () => {
        try {
            await applyCropAndGetFile();
        } catch {
            toast.error(t("cropFailed"), {position: "top-center"});
        }
    };

    const handleCancelCrop = () => {
        if (!posterPreview) {
            setEditorImageSrc(null);
        }
        setIsCropping(false);
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
                    startCropping(file);
                    return;
                }
            }
            toast.error(t("clipboardNoImage"), { position: "top-center"})
        } catch {
            toast.error(t("clipboardNoImage"), { position: "top-center"})
        }
    };

    const removePoster = () => {
        setPosterFile(null);
        setPosterPreview(null);
        setEditorImageSrc(null);
        setIsCropping(false);
        onCropReset();
        croppedAreaPixelsRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errors: Record<string, string> = {};
        const fieldsToValidate = [
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

        // Auto-apply crop if still in cropping mode
        let croppedFile: File | null = null;
        if (isCropping && editorImageSrc) {
            try {
                croppedFile = await applyCropAndGetFile();
            } catch {
                toast.error(t("cropFailed"), {position: "top-center"});
                return;
            }
        }

        mutation.mutate(croppedFile);
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5"/>
                        {t("addNewEntry")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Poster Upload */}
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
                        {isCropping && editorImageSrc ? (
                            <div className="space-y-3">
                                <div className="relative w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden border">
                                    <Cropper
                                        crop={crop}
                                        zoom={zoom}
                                        rotation={rotation}
                                        aspectRatio={4 / 3}
                                        withGrid={withGrid}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onRotationChange={setRotation}
                                        onCropAreaChange={onCropComplete}
                                    >
                                        <CropperImage
                                            src={editorImageSrc}
                                            alt="Image to crop"
                                            crossOrigin="anonymous"
                                        />
                                        <CropperArea />
                                    </Cropper>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0"/>
                                        <span className="text-sm text-muted-foreground w-12">{t("zoom")}</span>
                                        <input
                                            type="range"
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            value={zoom}
                                            onChange={(e) => setZoom(Number(e.target.value))}
                                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <RotateCw className="h-4 w-4 text-muted-foreground shrink-0"/>
                                        <span className="text-sm text-muted-foreground w-12">{t("rotate")}</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={360}
                                            step={1}
                                            value={rotation}
                                            onChange={(e) => setRotation(Number(e.target.value))}
                                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => setRotation((prev) => (prev + 90) % 360)}
                                        >
                                            <RotateCw className="h-3.5 w-3.5"/>
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Switch id="add-crop-grid" checked={withGrid} onCheckedChange={setWithGrid} size="sm"/>
                                            <Label htmlFor="add-crop-grid" className="text-sm text-muted-foreground">{t("showGrid")}</Label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" onClick={handleApplyCrop} className="flex-1">
                                        {t("applyCrop")}
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" onClick={onCropReset}>
                                        <RotateCcw className="h-3.5 w-3.5"/>
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleCancelCrop}>
                                        {t("cancel")}
                                    </Button>
                                </div>
                            </div>
                        ) : posterPreview ? (
                            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border">
                                <img
                                    src={posterPreview}
                                    alt="Poster preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {editorImageSrc && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="h-7 w-7"
                                            aria-label={t("imageEditorTitle")}
                                            onClick={() => setIsCropping(true)}
                                        >
                                            <Crop className="h-3.5 w-3.5"/>
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <ImagePlus className="h-3.5 w-3.5"/>
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

                    <FieldGroup>
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="title" className="flex items-center gap-1.5">
                                    <Type className="h-3.5 w-3.5"/>
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
                                    <Calendar className="h-3.5 w-3.5"/>
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
                                <Film className="h-3.5 w-3.5"/>
                                {t("type")}
                            </FieldLabel>
                            <Select
                                value={type.toString()}
                                onValueChange={(v) => setType(Number(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(contentTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field>
                            <FieldContent>
                                <FieldLabel className="flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5"/>
                                    {t("genre")}
                                </FieldLabel>
                                <FieldDescription>
                                    {t("genreDescription")}
                                </FieldDescription>
                            </FieldContent>
                            <GenreMultiSelect value={genre} onChange={setGenre}/>
                        </Field>
                    </FieldGroup>

                    <FieldGroup className="gap-4">
                        <Field>
                            <FieldLabel htmlFor="description" className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5"/>
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
                                                    <Field key={uid} orientation="horizontal" className="gap-4">
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
                                                                className="w-20 h-8"
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
                                type === ContentType.Anime ||
                                type === ContentType.Series ||
                                type === ContentType.Cartoon) && (
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
                            {(status === WatchStatus.Dropped || status === WatchStatus.Completed) && (
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

                            {status === WatchStatus.Watching && (
                                type === ContentType.Anime ||
                                type === ContentType.Series ||
                                type === ContentType.Cartoon) && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field>
                                            <FieldLabel htmlFor="currentSeason" className="text-sm">
                                                {t("season") || "Сезон"}
                                            </FieldLabel>
                                            <Input
                                                id="currentSeason"
                                                type="number"
                                                value={currentSeason}
                                                onChange={(e) => setCurrentSeason(e.target.value)}
                                                min="1"
                                                placeholder="1"
                                                className="h-8"
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="currentEpisode" className="text-sm">
                                                {t("episode") || "Серия"}
                                            </FieldLabel>
                                            <Input
                                                id="currentEpisode"
                                                type="number"
                                                value={currentEpisode}
                                                onChange={(e) => setCurrentEpisode(e.target.value)}
                                                min="1"
                                                placeholder="1"
                                                className="h-8"
                                            />
                                        </Field>
                                    </div>
                                    <Field>
                                        <FieldLabel htmlFor="totalEpisodes" className="text-sm">
                                            {t("totalEpisodes") || "Всего серий"}
                                        </FieldLabel>
                                        <Input
                                            id="totalEpisodes"
                                            type="number"
                                            value={totalEpisodes}
                                            onChange={(e) => setTotalEpisodes(e.target.value)}
                                            min="1"
                                            placeholder="13"
                                            className="h-8"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel className="text-sm">
                                            {t("watchingTime") || "Время остановки"}
                                        </FieldLabel>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <Input
                                                    type="number"
                                                    value={hours}
                                                    onChange={(e) => setHours(e.target.value)}
                                                    min="0"
                                                    placeholder="Часы"
                                                    className="h-8"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    value={minutes}
                                                    onChange={(e) => setMinutes(e.target.value)}
                                                    min="0"
                                                    max="59"
                                                    placeholder="Минуты"
                                                    className="h-8"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    value={seconds}
                                                    onChange={(e) => setSeconds(e.target.value)}
                                                    min="0"
                                                    max="59"
                                                    placeholder="Секунды"
                                                    className="h-8"
                                                />
                                            </div>
                                        </div>
                                    </Field>
                                </>
                            )}
                        </>
                    )}

                    <FieldGroup className="gap-4">
                        {(status === WatchStatus.Completed || status === WatchStatus.Dropped) && (
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
                        )}

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
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
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
        </>
    );
}
