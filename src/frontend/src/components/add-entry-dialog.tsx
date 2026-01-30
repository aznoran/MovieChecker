"use client";

import { toast } from "sonner"
import {useState, useRef, useEffect} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createMovie, createWatchEntry, uploadPoster} from "@/lib/api";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {useAuth} from "@/context/auth-context";
import {
    ContentType,
    WatchStatus,
    WatchedBy,
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
    ZoomIn,
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

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({open, onOpenChange}: Props) {
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup} = useGroup();
    const isGroupMode = !!activeGroupId && !!activeGroup;
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
    const [posterZoom, setPosterZoom] = useState(1);
    const [posterPosition, setPosterPosition] = useState({x: 0, y: 0});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({x: 0, y: 0});
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
        mutationFn: async () => {
            let posterUrl: string | undefined;
            if (posterFile) {
                // Create cropped version of the image based on zoom and position
                const croppedImage = await createCroppedImage();
                if (croppedImage) {
                    posterUrl = await uploadPoster(croppedImage);
                } else {
                    // Fallback to original if cropping fails
                    posterUrl = await uploadPoster(posterFile);
                }
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
                watchedBy: isGroupMode ? WatchedBy.Together : WatchedBy.Me,
                rating: !isGroupMode && myRating ? parseInt(myRating) : undefined,
                ratings: ratingsArray,
                emotion: emotion ?? undefined,
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
        onError: () => {
            toast.error(t("failedToAdd"), { position: "top-center" })
            setError(t("failedToAdd"));
        },
    });

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
        setPosterZoom(1); // Reset zoom when form resets
        setPosterPosition({x: 0, y: 0}); // Reset position when form resets
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
        setImageFile(file);
    };

    const setImageFile = (file: File) => {
        setPosterFile(file);
        setPosterZoom(1); // Reset zoom when new image is loaded
        setPosterPosition({x: 0, y: 0}); // Reset position when new image is loaded
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
        setPosterZoom(1); // Reset zoom when poster is removed
        setPosterPosition({x: 0, y: 0}); // Reset position when poster is removed
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const createCroppedImage = async (): Promise<File | null> => {
        if (!posterPreview || !posterFile) return null;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // Target dimensions for the cropped poster
                const canvas = document.createElement('canvas');
                const targetWidth = 400;
                const targetHeight = 600;
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // The preview container dimensions (h-48 = 192px)
                const previewHeight = 192;
                const previewWidth = previewHeight * (targetWidth / targetHeight); // 128px for 2:3 ratio
                
                // Calculate how the image is displayed with object-contain in the preview
                const imageAspect = img.width / img.height;
                const previewAspect = previewWidth / previewHeight;
                
                let baseWidth, baseHeight, baseOffsetX, baseOffsetY;
                if (imageAspect > previewAspect) {
                    // Image is wider - fit to width
                    baseWidth = previewWidth;
                    baseHeight = previewWidth / imageAspect;
                    baseOffsetX = 0;
                    baseOffsetY = (previewHeight - baseHeight) / 2;
                } else {
                    // Image is taller - fit to height
                    baseHeight = previewHeight;
                    baseWidth = previewHeight * imageAspect;
                    baseOffsetX = (previewWidth - baseWidth) / 2;
                    baseOffsetY = 0;
                }

                // CSS transform: scale(posterZoom) translate(posterPosition.x / posterZoom, posterPosition.y / posterZoom)
                // This means: first scale, then translate by position/zoom
                // The translate happens in the scaled coordinate space
                
                // After scale, dimensions are:
                const scaledWidth = baseWidth * posterZoom;
                const scaledHeight = baseHeight * posterZoom;
                
                // After translate (in scaled space):
                // The image center moves by (posterPosition.x / posterZoom, posterPosition.y / posterZoom) in original space
                // Or equivalently, by (posterPosition.x, posterPosition.y) in scaled space
                const finalOffsetX = baseOffsetX * posterZoom + posterPosition.x;
                const finalOffsetY = baseOffsetY * posterZoom + posterPosition.y;

                // Now calculate what part of the original image is visible in the preview window
                const scale = img.width / baseWidth; // Original pixels per base display pixel
                
                // The preview window shows from 0,0 to previewWidth,previewHeight
                // After transform, the image top-left is at (finalOffsetX, finalOffsetY)
                // We want the portion that overlaps [0, previewWidth] x [0, previewHeight]
                
                const srcX = (-finalOffsetX / posterZoom) * scale;
                const srcY = (-finalOffsetY / posterZoom) * scale;
                const srcWidth = (previewWidth / posterZoom) * scale;
                const srcHeight = (previewHeight / posterZoom) * scale;

                // Fill background
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, 0, targetWidth, targetHeight);
                
                // Draw the cropped portion
                ctx.drawImage(
                    img,
                    srcX, srcY, srcWidth, srcHeight,
                    0, 0, targetWidth, targetHeight
                );

                // Convert to blob and then to file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], posterFile.name, {
                            type: posterFile.type || 'image/jpeg'
                        });
                        resolve(croppedFile);
                    } else {
                        resolve(null);
                    }
                }, posterFile.type || 'image/jpeg', 0.95);
            };
            
            img.src = posterPreview;
        });
    };

                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        const croppedFile = new File([blob], posterFile.name, {
                            type: posterFile.type || 'image/jpeg'
                        });
                        resolve(croppedFile);
                    } else {
                        resolve(null);
                    }
                }, posterFile.type || 'image/jpeg', 0.95);
            };
            
            img.src = posterPreview;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
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
        mutation.mutate();
    };

    return (
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
                        {posterPreview ? (
                            <div className="space-y-3">
                                <div 
                                    className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted cursor-move"
                                    onMouseDown={(e) => {
                                        setIsDragging(true);
                                        setDragStart({
                                            x: e.clientX - posterPosition.x,
                                            y: e.clientY - posterPosition.y
                                        });
                                    }}
                                    onMouseMove={(e) => {
                                        if (isDragging) {
                                            setPosterPosition({
                                                x: e.clientX - dragStart.x,
                                                y: e.clientY - dragStart.y
                                            });
                                        }
                                    }}
                                    onMouseUp={() => setIsDragging(false)}
                                    onMouseLeave={() => setIsDragging(false)}
                                    onTouchStart={(e) => {
                                        const touch = e.touches[0];
                                        setIsDragging(true);
                                        setDragStart({
                                            x: touch.clientX - posterPosition.x,
                                            y: touch.clientY - posterPosition.y
                                        });
                                    }}
                                    onTouchMove={(e) => {
                                        if (isDragging && e.touches[0]) {
                                            const touch = e.touches[0];
                                            setPosterPosition({
                                                x: touch.clientX - dragStart.x,
                                                y: touch.clientY - dragStart.y
                                            });
                                        }
                                    }}
                                    onTouchEnd={() => setIsDragging(false)}
                                >
                                    <img
                                        src={posterPreview}
                                        alt="Poster preview"
                                        className="w-full h-full object-contain pointer-events-none select-none"
                                        style={{
                                            transform: `scale(${posterZoom}) translate(${posterPosition.x / posterZoom}px, ${posterPosition.y / posterZoom}px)`,
                                            transformOrigin: 'center center',
                                        }}
                                        draggable={false}
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 z-10"
                                        onClick={removePoster}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ZoomIn className="h-4 w-4 text-muted-foreground"/>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="3"
                                        step="0.1"
                                        value={posterZoom}
                                        onChange={(e) => setPosterZoom(parseFloat(e.target.value))}
                                        aria-label="Zoom level"
                                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0"
                                    />
                                    <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                                        {Math.round(posterZoom * 100)}%
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    {t("dragToRepositionHint")}
                                </p>
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
                                        {status === WatchStatus.Planned || status === WatchStatus.Watching
                                            ? t("watchingBy")
                                            : t("watchedBy")}
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
                                                                className="w-24 h-8"
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
    );
}
