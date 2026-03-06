"use client";

import {toast} from "sonner";
import {useState, useEffect, useCallback} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {apiClient} from "@/lib/api";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {
    EntryContentType,
    WatchStatus,
    GroupType,
} from "@/lib/api/generated";
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
import {GenreMultiSelect} from "@/components/entry/genre-multi-select";
import {
    Type,
    Calendar as CalendarIcon,
    CalendarDays,
    Film,
    Tag,
    FileText,
    ListChecks,
    MessageSquare,
    Loader2,
    Search,
    RefreshCw,
} from "lucide-react";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Controller} from "react-hook-form";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldContent,
    FieldGroup,
} from "@/components/ui/field";
import {usePermissions} from "@/context/permissions-context";
import {useSession} from "next-auth/react";
import {useImageCropper} from "@/hooks/use-image-cropper";
import {PosterUploadSection} from "@/components/entry/poster-upload-section";
import {SeriesTrackingSection} from "@/components/entry/series-tracking-section";
import {RatingSection} from "@/components/entry/rating-section";
import {MemberSelect} from "@/components/entry/member-select";
import {SearchResultsPanel} from "@/components/entry/search-results-panel";
import {SearchAllResultsDialog} from "@/components/entry/search-all-results-dialog";
import {useExternalSearch} from "@/hooks/api/external-search";
import {useDebounce} from "@/hooks/use-debounce";
import {searchApiClient} from "@/lib/api/client";
import type {SearchResultDto, TranslatedResultDto} from "@/lib/api/generated";
import type {TranslationKeys} from "@/lib/i18n/en";

function createAddEntrySchema(t: (key: TranslationKeys) => string) {
    return z.object({
        title: z.string().min(1, t("titleRequired")).max(255, t("titleTooLong")),
        description: z.string().max(2500, t("descriptionTooLong")).optional().or(z.literal("")),
        contentType: z.nativeEnum(EntryContentType),
        year: z.string()
            .refine(v => !v || (/^\d+$/.test(v) && +v >= 1900 && +v <= 2100), t("invalidYear"))
            .optional()
            .or(z.literal("")),
        genre: z.string().optional().or(z.literal("")),
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

type AddEntryFormValues = z.infer<ReturnType<typeof createAddEntrySchema>>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({open, onOpenChange}: Props) {
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup} = useGroup();
    const {permissions} = usePermissions();
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const canRateOthers = permissions.canRateOthers;
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    // Non-form state (binary/complex data not suited for RHF)
    const [myRating, setMyRating] = useState(0);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [memberRatings, setMemberRatings] = useState<Record<string, number>>({});
    const [error, setError] = useState("");

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchEnabled, setSearchEnabled] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [showAllResults, setShowAllResults] = useState(false);
    const [externalPosterUrl, setExternalPosterUrl] = useState<string | null>(null);
    const [tmdbId, setTmdbId] = useState<number | null>(null);
    const [anilistId, setAnilistId] = useState<number | null>(null);
    const [isCustom, setIsCustom] = useState(true);
    const [autoFilledSnapshot, setAutoFilledSnapshot] = useState<Record<string, string> | null>(null);

    // Translate state
    const [translatedResults, setTranslatedResults] = useState<TranslatedResultDto[]>([]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatePhase, setTranslatePhase] = useState<"idle" | "exit" | "enter">("idle");

    // Map locale to TMDB language
    const searchLanguage = locale === "ru" ? "ru-RU" : "en-US";

    const cropper = useImageCropper({
        onPosterRemoved: () => setExternalPosterUrl(null),
    });

    const form = useForm<AddEntryFormValues>({
        resolver: zodResolver(createAddEntrySchema(t)),
        defaultValues: {
            title: "",
            description: "",
            contentType: EntryContentType.Movie,
            year: "",
            genre: "",
            status: WatchStatus.Planned,
            comment: "",
            currentSeason: "",
            currentEpisode: "",
            totalEpisodes: "",
            totalSeasons: "",
            runtimeSeconds: "",
            hours: "",
            minutes: "",
            seconds: "",
            rewatchCount: "",
        },
        mode: "onBlur",
    });

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);
    const queryClient = useQueryClient();

    const resetForm = useCallback(() => {
        form.reset();
        setMyRating(0);
        setSelectedMembers([]);
        setMemberRatings({});
        setError("");
        setSearchQuery("");
        setSearchEnabled(false);
        setShowSearchPanel(false);
        setShowAllResults(false);
        setExternalPosterUrl(null);
        setTmdbId(null);
        setAnilistId(null);
        setIsCustom(true);
        setAutoFilledSnapshot(null);
        setTranslatedResults([]);
        setIsTranslating(false);
        cropper.resetCropper();
    }, [form, cropper.resetCropper]);

    useEffect(() => {
        if (open) resetForm();
    }, [open, resetForm]);

    const watchedStatus = form.watch("status");
    const watchedContentType = form.watch("contentType");

    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const searchResults = useExternalSearch(debouncedSearchQuery, searchEnabled, searchLanguage);

    const handleSearch = () => {
        const title = form.getValues("title");
        if (title.trim().length >= 2) {
            setSearchQuery(title.trim());
            setSearchEnabled(true);
            setShowSearchPanel(true);
        }
    };

    const handleExternalSelect = (result: SearchResultDto) => {
        // Map suggestedType to EntryContentType
        const typeMap: Record<string, EntryContentType> = {
            Movie: EntryContentType.Movie,
            Series: EntryContentType.Series,
            Anime: EntryContentType.Anime,
            Cartoon: EntryContentType.Cartoon,
            Show: EntryContentType.Show,
        };

        // When selecting from a group, prefer the localized title/description
        // from another provider that originally returned data in the user's language
        let bestTitle = result.title ?? "";
        let bestDescription = result.description ?? "";
        if (searchLanguage !== "en-US") {
            const allResults = getDisplayResults();
            const selectedKey = (result.englishTitle ?? result.title ?? "").toLowerCase().trim();
            const groupResults = allResults.filter(
                (r) => (r.englishTitle ?? r.title ?? "").toLowerCase().trim() === selectedKey
            );
            if (groupResults.length > 1) {
                // Find a result whose title differs from its englishTitle (localized)
                const localizedResult = groupResults.find(
                    (r) => r.englishTitle && (r.title ?? "").toLowerCase() !== r.englishTitle.toLowerCase()
                );
                if (localizedResult) {
                    bestTitle = localizedResult.title ?? "";
                    if (localizedResult.description) {
                        bestDescription = localizedResult.description;
                    }
                }
            }
        }

        const suggestedType = result.suggestedType ?? "";
        const snapshot: Record<string, string> = {
            title: bestTitle,
            description: bestDescription,
            year: result.year?.toString() ?? "",
            genre: result.genre ?? "",
            contentType: typeMap[suggestedType]?.toString() ?? EntryContentType.Movie.toString(),
        };

        form.setValue("title", bestTitle);
        form.setValue("description", bestDescription);
        form.setValue("year", result.year?.toString() ?? "");
        form.setValue("genre", result.genre ?? "");
        if (typeMap[suggestedType]) {
            form.setValue("contentType", typeMap[suggestedType]);
        }
        if (result.totalEpisodes) {
            form.setValue("totalEpisodes", result.totalEpisodes.toString());
        }
        if (result.totalSeasons) {
            form.setValue("totalSeasons", result.totalSeasons.toString());
        }
        if (result.runtimeMinutes) {
            form.setValue("runtimeSeconds", (result.runtimeMinutes * 60).toString());
        }

        // Set external IDs
        if (result.provider === "Tmdb") {
            setTmdbId(result.externalId ?? null);
            setAnilistId(null);
        } else {
            setAnilistId(result.externalId ?? null);
            setTmdbId(null);
        }

        setExternalPosterUrl(result.posterUrl ?? null);
        if (result.posterUrl) {
            cropper.resetCropper(result.posterUrl);
        }
        setIsCustom(false);
        setAutoFilledSnapshot(snapshot);
        setShowSearchPanel(false);
        setShowAllResults(false);
    };

    // Get display results (merging translations)
    const getDisplayResults = useCallback((): (SearchResultDto & { isTranslated?: boolean })[] => {
        const raw = searchResults.data ?? [];
        if (translatedResults.length === 0) return raw;
        return raw.map((r) => {
            const tr = translatedResults.find(
                (t) => t.externalId === r.externalId && t.provider === r.provider
            );
            if (!tr) return r;
            return { ...r, title: tr.title, description: tr.description ?? r.description, isTranslated: tr.isTranslated };
        });
    }, [searchResults.data, translatedResults]);

    const handleTranslate = async () => {
        const results = searchResults.data;
        if (!results || results.length === 0) return;
        setIsTranslating(true);
        try {
            const targetLang = locale === "ru" ? "ru" : "en";
            const { data: translated } = await searchApiClient.api.searchTranslateCreate({
                results,
                targetLanguage: targetLang,
            });
            setIsTranslating(false);
            // Animate: exit → swap data → enter
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reducedMotion) {
                setTranslatedResults(translated);
                return;
            }
            setTranslatePhase("exit");
            setTimeout(() => {
                setTranslatedResults(translated);
                setTranslatePhase("enter");
                setTimeout(() => setTranslatePhase("idle"), 320);
            }, 220);
        } catch {
            setIsTranslating(false);
            toast.error("Translation failed", {position: "top-center"});
        }
    };

    const handleForceTranslate = async (externalId: number, provider: string) => {
        const results = searchResults.data;
        if (!results || results.length === 0) return;
        setIsTranslating(true);
        try {
            const targetLang = locale === "ru" ? "ru" : "en";
            const { data: translated } = await searchApiClient.api.searchTranslateCreate({
                results,
                targetLanguage: targetLang,
                forceTranslate: [{ externalId, provider }],
            });
            setIsTranslating(false);
            setTranslatedResults(translated);
        } catch {
            setIsTranslating(false);
            toast.error("Translation failed", {position: "top-center"});
        }
    };

    // Track if user modifies auto-filled fields → mark as custom
    useEffect(() => {
        if (!autoFilledSnapshot) return;
        const subscription = form.watch((values) => {
            const changed = (
                values.title !== autoFilledSnapshot.title ||
                (values.description ?? "") !== autoFilledSnapshot.description ||
                (values.year ?? "") !== autoFilledSnapshot.year ||
                (values.genre ?? "") !== autoFilledSnapshot.genre
            );
            if (changed) setIsCustom(true);
        });
        return () => subscription.unsubscribe();
    }, [autoFilledSnapshot, form]);

    const mutation = useMutation({
        mutationFn: async (overridePosterFile?: File | null) => {
            const values = form.getValues();
            const fileToUpload = overridePosterFile ?? cropper.posterFile;
            let posterUrl: string | undefined;
            if (fileToUpload) {
                const uploadRes = await apiClient.api.uploadPosterCreate({file: fileToUpload});
                posterUrl = (uploadRes.data.id || 0).toString();
            }

            // Use external poster URL if no uploaded poster
            const finalPosterUrl = posterUrl || externalPosterUrl || undefined;

            const movieRes = await apiClient.api.moviesCreate({
                title: values.title,
                description: values.description || undefined,
                type: values.contentType,
                year: values.year ? parseInt(values.year) : undefined,
                genre: values.genre || undefined,
                posterUrl: finalPosterUrl,
                tmdbId: tmdbId ?? undefined,
                anilistId: anilistId ?? undefined,
                isCustom,
            });
            const movie = movieRes.data;

            const ratingsArray = isGroupMode
                ? selectedMembers
                    .filter((uid) => memberRatings[uid])
                    .map((uid) => ({userId: uid, rating: memberRatings[uid] * 2}))
                : undefined;

            const isSeries = values.contentType === EntryContentType.Anime ||
                values.contentType === EntryContentType.Series ||
                values.contentType === EntryContentType.Cartoon;

            await apiClient.api.watchEntriesCreate({
                movieId: movie.id!,
                status: values.status,
                rating: !isGroupMode && myRating ? myRating * 2 : undefined,
                ratings: ratingsArray,
                viewers: isGroupMode ? selectedMembers : undefined,
                comment: values.comment || undefined,
                groupId: activeGroupId,
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
                    rewatchCount: values.rewatchCount ? parseInt(values.rewatchCount) : undefined,
                } : {}),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            queryClient.invalidateQueries({queryKey: ["stats"]});
            toast.success(t("postAdded"), {position: "top-center"});
            resetForm();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const err = error as Record<string, Record<string, Record<string, string>>>;
            const errorMessage = err?.response?.data?.message || t("failedToAdd");
            toast.error(errorMessage, {position: "top-center"});
            setError(errorMessage);
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

    const handleSubmit = async (values: AddEntryFormValues) => {
        // Additional validation for member ratings
        if (isGroupMode && (values.status === WatchStatus.Completed || values.status === WatchStatus.Dropped)) {
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

    // Helper to pass validation errors + handleFieldChange to SeriesTrackingSection
    const validationErrors: Record<string, string> = {};
    const formErrors = form.formState.errors;
    for (const key of ["currentSeason", "currentEpisode", "totalEpisodes", "totalSeasons", "runtimeSeconds", "hours", "minutes", "seconds"] as const) {
        if (formErrors[key]?.message) {
            validationErrors[key] = formErrors[key].message as string;
        }
    }

    const handleFieldChange = (name: string, value: string) => {
        form.setValue(name as keyof AddEntryFormValues, value, {shouldValidate: true});
    };

    const showTracking = watchedStatus === WatchStatus.Watching || watchedStatus === WatchStatus.Dropped;

    const showRating = watchedStatus === WatchStatus.Completed || watchedStatus === WatchStatus.Dropped;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col !overflow-visible">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="h-5 w-5"/>
                        {t("addNewEntry")}
                    </DialogTitle>
                </DialogHeader>

                {/* Search panel — positioned to the right of dialog on desktop */}
                {showSearchPanel && (
                    <div className="absolute left-full top-0 bottom-0 ml-3 hidden md:block z-50">
                        <SearchResultsPanel
                            results={getDisplayResults()}
                            isLoading={searchResults.isLoading}
                            onSelect={handleExternalSelect}
                            onClose={() => setShowSearchPanel(false)}
                            onShowAll={() => setShowAllResults(true)}
                            onTranslate={handleTranslate}
                            onForceTranslate={handleForceTranslate}
                            isTranslating={isTranslating}
                            translatePhase={translatePhase}
                        />
                    </div>
                )}

                <ScrollArea className="flex-1">
                    <div style={{maxHeight: "calc(85vh - 120px)"}}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pr-4">
                                <PosterUploadSection
                                    cropper={cropper}
                                    fileInputRef={cropper.fileInputRef}
                                    onFileChange={cropper.handleFileChange}
                                    gridSwitchId="add-crop-grid"
                                    canReCropFromPreview
                                />

                                <FieldGroup>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Controller
                                            control={form.control}
                                            name="title"
                                            render={({field, fieldState}) => (
                                                <Field data-invalid={fieldState.invalid || undefined}>
                                                    <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                        <Type className="h-3.5 w-3.5"/>
                                                        {t("title")} *
                                                    </FieldLabel>
                                                    <div className="relative">
                                                        <Input {...field} id={field.name} autoFocus aria-invalid={fieldState.invalid} className="pr-20" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}/>
                                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                            <kbd className="pointer-events-none select-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                Enter ↵
                                                            </kbd>
                                                            <button
                                                                type="button"
                                                                className="p-1 rounded hover:bg-accent transition-colors"
                                                                onClick={handleSearch}
                                                                title={t("searchPlaceholder")}
                                                            >
                                                                <Search className="h-4 w-4 text-muted-foreground"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                                </Field>
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="year"
                                            render={({field, fieldState}) => (
                                                <Field data-invalid={fieldState.invalid || undefined}>
                                                    <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                        <CalendarIcon className="h-3.5 w-3.5"/>
                                                        {t("year")}
                                                    </FieldLabel>
                                                    <div className="relative">
                                                        <Input {...field} id={field.name} placeholder="2024" aria-invalid={fieldState.invalid} className="pr-8"/>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon-xs"
                                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2"
                                                                    title={t("pickYear")}
                                                                >
                                                                    <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="end">
                                                                <Calendar
                                                                    mode="single"
                                                                    captionLayout="dropdown"
                                                                    defaultMonth={field.value ? new Date(+field.value, 0) : undefined}
                                                                    onSelect={(date) => {
                                                                        if (date) field.onChange(date.getFullYear().toString());
                                                                    }}
                                                                    startMonth={new Date(1900, 0)}
                                                                    endMonth={new Date(2100, 11)}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                                </Field>
                                            )}
                                        />
                                    </div>
                                </FieldGroup>

                                <FieldGroup className="gap-4">
                                    <Controller
                                        control={form.control}
                                        name="contentType"
                                        render={({field, fieldState}) => (
                                            <Field data-invalid={fieldState.invalid || undefined}>
                                                <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                    <Film className="h-3.5 w-3.5"/>
                                                    {t("type")}
                                                </FieldLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue/></SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(contentTypeLabels).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        control={form.control}
                                        name="genre"
                                        render={({field}) => (
                                            <Field>
                                                <FieldContent>
                                                    <FieldLabel className="flex items-center gap-1.5">
                                                        <Tag className="h-3.5 w-3.5"/>
                                                        {t("genre")}
                                                    </FieldLabel>
                                                    <FieldDescription>{t("genreDescription")}</FieldDescription>
                                                </FieldContent>
                                                <GenreMultiSelect value={field.value ?? ""} onChange={field.onChange}/>
                                            </Field>
                                        )}
                                    />
                                </FieldGroup>

                                <FieldGroup className="gap-4">
                                    <Controller
                                        control={form.control}
                                        name="description"
                                        render={({field, fieldState}) => (
                                            <Field data-invalid={fieldState.invalid || undefined}>
                                                <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5"/>
                                                    {t("description")}
                                                </FieldLabel>
                                                <Textarea {...field} id={field.name} rows={2} aria-invalid={fieldState.invalid}/>
                                                {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        control={form.control}
                                        name="status"
                                        render={({field, fieldState}) => (
                                            <Field data-invalid={fieldState.invalid || undefined}>
                                                <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                    <ListChecks className="h-3.5 w-3.5"/>
                                                    {t("status")}
                                                </FieldLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}><SelectValue/></SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(watchStatusLabels).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
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
                                                canRateOthers={canRateOthers ?? false}
                                                canRateSelf
                                                currentUserId={currentUserId}
                                            />
                                        )}

                                        {showTracking && (
                                            <SeriesTrackingSection
                                                contentType={watchedContentType}
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
                                                currentUserId={currentUserId}
                                            />
                                        )}

                                        {showTracking && (
                                            <SeriesTrackingSection
                                                contentType={watchedContentType}
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
                                                wrapped={false}
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
                                                    <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                        <MessageSquare className="h-3.5 w-3.5"/>
                                                        {t("comment")}
                                                    </FieldLabel>
                                                    <FieldDescription>{t("commentDescription")}</FieldDescription>
                                                </FieldContent>
                                                <Textarea
                                                    {...field}
                                                    id={field.name}
                                                    rows={2}
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
                    </div>
                </ScrollArea>

                {/* Mobile: show panel below form */}
                {showSearchPanel && (
                    <div className="md:hidden">
                        <SearchResultsPanel
                            results={getDisplayResults()}
                            isLoading={searchResults.isLoading}
                            onSelect={handleExternalSelect}
                            onClose={() => setShowSearchPanel(false)}
                            onShowAll={() => setShowAllResults(true)}
                            onTranslate={handleTranslate}
                            onForceTranslate={handleForceTranslate}
                            isTranslating={isTranslating}
                            translatePhase={translatePhase}
                        />
                    </div>
                )}

                <SearchAllResultsDialog
                    open={showAllResults}
                    onOpenChange={setShowAllResults}
                    results={getDisplayResults()}
                    onSelect={handleExternalSelect}
                    onTranslate={handleTranslate}
                    onForceTranslate={handleForceTranslate}
                    isTranslating={isTranslating}
                    translatePhase={translatePhase}
                />
            </DialogContent>
        </Dialog>
    );
}
