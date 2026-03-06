"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { usePermissions } from "@/context/permissions-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getPosterUrl, apiClient } from "@/lib/api";
import { useWatchEntries, useArchivedEntries, useDeleteWatchEntry, useRestoreWatchEntry, useUserSettings, useUpdateUserSettings } from "@/hooks/api";
import { queryKeys } from "@/hooks/api/keys";
import { WatchStatus, EntryContentType } from "@/lib/api/generated";
import type { WatchEntryDto } from "@/lib/api/generated";
import {
    getContentTypeLabels,
    getWatchStatusLabels,
    translateGenre,
} from "@/lib/i18n/labels";
import { AddEntryDialog } from "@/components/entry/add-entry-dialog";
import { EditEntryDialog } from "@/components/entry/edit-entry-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Hitbox } from "@/components/ui/hitbox";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
    Plus,
    Trash2,
    Star,
    MessageSquare,
    Film,
    Calendar,
    Tag,
    Loader2,
    Popcorn,
    ImageOff,
    Play,
    Clock,
    RefreshCw,
    AlertCircle,
    Settings,
    CheckCircle2,
    PlayCircle,
    XCircle,
    Info,
    EllipsisVertical,
    Archive,
    ArchiveRestore,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {HoverCard, HoverCardTrigger, HoverCardContent} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

type CardSize = "small" | "medium" | "large";
type AnimationSpeed = "slow" | "normal" | "fast" | "off";

const CARD_SIZE_KEY = "moviechecker-card-size";
const ANIMATION_SPEED_KEY = "moviechecker-animation-speed";

const cardSizeSteps: CardSize[] = ["small", "medium", "large"];
const animSpeedSteps: AnimationSpeed[] = ["off", "slow", "normal", "fast"];

const animationDurations: Record<AnimationSpeed, number> = {
    slow: 0.5,
    normal: 0.3,
    fast: 0.15,
    off: 0,
};

const gridClasses: Record<CardSize, string> = {
    small: "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    medium: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    large: "grid gap-5 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
};

const cardTitleClasses: Record<CardSize, string> = {
    small: "font-semibold mb-1 truncate text-sm",
    medium: "font-semibold mb-2 truncate",
    large: "font-semibold mb-2 truncate text-lg",
};

const cardContentPadding: Record<CardSize, string> = {
    small: "p-2.5 flex flex-col justify-between min-h-0 overflow-hidden",
    medium: "p-4 flex flex-col justify-between min-h-0 overflow-hidden",
    large: "p-5 flex flex-col justify-between min-h-0 overflow-hidden",
};

const descriptionLines: Record<CardSize, string> = {
    small: "text-xs text-muted-foreground mb-2 break-words line-clamp-1",
    medium: "text-xs text-muted-foreground mb-4 break-words line-clamp-2",
    large: "text-sm text-muted-foreground mb-4 break-words line-clamp-3",
};

const descriptionLength: Record<CardSize, number> = {
    small: 60,
    medium: 100,
    large: 200,
};

const commentLength: Record<CardSize, number> = {
    small: 60,
    medium: 100,
    large: 200,
};

const commentLines: Record<CardSize, string> = {
    small: "text-xs text-muted-foreground line-clamp-1 break-words flex items-start gap-1",
    medium: "text-sm text-muted-foreground line-clamp-2 break-words flex items-start gap-1",
    large: "text-sm text-muted-foreground line-clamp-3 break-words flex items-start gap-1",
};

const metaSpacing: Record<CardSize, string> = {
    small: "mb-2",
    medium: "mb-4",
    large: "mb-4",
};

const skeletonCounts: Record<CardSize, number> = {
    small: 10,
    medium: 8,
    large: 6,
};

const skeletonTitleHeight: Record<CardSize, string> = {
    small: "h-4",
    medium: "h-5",
    large: "h-6",
};

const dropdownTriggerSize: Record<CardSize, "icon-xs" | "icon-sm" | "icon"> = {
    small: "icon-xs",
    medium: "icon-sm",
    large: "icon",
};

const dropdownIconClasses: Record<CardSize, string> = {
    small: "!size-3",
    medium: "!size-4",
    large: "!size-5",
};

const dropdownContentClasses: Record<CardSize, string> = {
    small: "min-w-[7rem] p-0.5",
    medium: "min-w-[8rem]",
    large: "min-w-[12rem] p-2",
};

const dropdownItemClasses: Record<CardSize, string> = {
    small: "text-xs py-1 px-1.5 gap-1.5",
    medium: "",
    large: "text-base py-2.5 px-3 gap-2.5",
};

const statusMenuItemColors: Record<WatchStatus, string> = {
    [WatchStatus.Planned]: "text-blue-400 focus:text-blue-400 focus:bg-blue-500/10 [&_svg]:!text-blue-400",
    [WatchStatus.Watching]: "text-yellow-400 focus:text-yellow-400 focus:bg-yellow-500/10 [&_svg]:!text-yellow-400",
    [WatchStatus.Completed]: "text-green-400 focus:text-green-400 focus:bg-green-500/10 [&_svg]:!text-green-400",
    [WatchStatus.Dropped]: "text-red-400 focus:text-red-400 focus:bg-red-500/10 [&_svg]:!text-red-400",
    [WatchStatus.Considering]: "text-gray-400 focus:text-gray-400 focus:bg-gray-500/10 [&_svg]:!text-gray-400",
};

function CardSkeleton({size}: {size: CardSize}) {
    return (
        <Card className="overflow-hidden grid grid-rows-[auto_1fr] gap-0 py-0">
            <Skeleton className="w-full aspect-[4/3] rounded-none"/>
            <CardContent className={cardContentPadding[size]}>
                <div className="min-w-0">
                    <div className={metaSpacing[size]}>
                        <Skeleton className={`${skeletonTitleHeight[size]} w-3/4 mb-2`}/>
                        <Skeleton className="h-3 w-1/2"/>
                    </div>
                    <div className={metaSpacing[size]}>
                        <Skeleton className="h-5 w-20 rounded-full"/>
                    </div>
                    <Skeleton className={`h-3 w-full ${metaSpacing[size]}`}/>
                    <Skeleton className="h-3 w-2/3"/>
                </div>
            </CardContent>
        </Card>
    );
}

const statusColors: Record<WatchStatus, string> = {
    [WatchStatus.Planned]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [WatchStatus.Watching]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    [WatchStatus.Completed]: "bg-green-500/20 text-green-400 border-green-500/30",
    [WatchStatus.Dropped]: "bg-red-500/20 text-red-400 border-red-500/30",
    [WatchStatus.Considering]: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function PosterImage({src, alt}: {src: string; alt?: string}) {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);

    const handleLoad = useCallback(() => setLoaded(true), []);
    const handleError = useCallback(() => {
        setLoaded(true);
        setErrored(true);
    }, []);

    if (errored) {
        return (
            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                <ImageOff className="h-10 w-10 text-muted-foreground/40"/>
            </div>
        );
    }

    return (
        <div className="w-full aspect-[4/3] overflow-hidden relative">
            {!loaded && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40"/>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}

function formatWatchingTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatSecondsToHMS(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0 && minutes > 0 && secs > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0 && secs > 0) return `${hours}h ${secs}s`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0 && secs > 0) return `${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m`;
    return `${secs}s`;
}

export const dynamic = "force-dynamic";

export default function HomePage() {
    const { data: session, status: authStatus } = useSession();
    const {locale, t} = useLocale();
    const {activeGroupId, isLoading: isGroupsLoading} = useGroup();
    const {permissions} = usePermissions();
    const router = useRouter();
    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);

    // Check if user can delete an entry based on permissions
    const canDeleteEntry = (entry: WatchEntryDto): boolean => {
        if (permissions.canDeleteAllEntries) return true;
        if (permissions.canDeleteOwnEntries) return entry.userId === session?.user?.id || false;
        return false;
    };

    // Check if user can create entries
    const canCreate = permissions.canCreateEntries;

    // Check if user can edit an entry based on permissions
    const canEditEntry = (entry: WatchEntryDto): boolean => {
        if (permissions.canEditAllEntries) return true;
        if (permissions.canEditOwnEntries) return entry.userId === session?.user?.id || false;
        return false;
    };

    const queryClient = useQueryClient();

    const [addOpen, setAddOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<WatchEntryDto | null>(null);
    const [statusFilter, setStatusFilter] = useState<WatchStatus | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [translateHintOpen, setTranslateHintOpen] = useState(false);
    const [cardSize, setCardSize] = useState<CardSize>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(CARD_SIZE_KEY);
            if (stored === "small" || stored === "medium" || stored === "large") return stored;
        }
        return "medium";
    });
    const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(ANIMATION_SPEED_KEY);
            if (stored === "slow" || stored === "normal" || stored === "fast" || stored === "off") return stored;
        }
        return "normal";
    });
    const animDuration = animationDurations[animationSpeed];

    const {data: userSettings} = useUserSettings({enabled: !!session});
    const updateUserSettings = useUpdateUserSettings();

    // Sync card size from backend on mount
    useEffect(() => {
        if (userSettings?.cardSize) {
            const backendSize = userSettings.cardSize as CardSize;
            if (backendSize === "small" || backendSize === "medium" || backendSize === "large") {
                setCardSize(backendSize);
                localStorage.setItem(CARD_SIZE_KEY, backendSize);
            }
        }
    }, [userSettings?.cardSize]);

    const handleCardSizeChange = (size: CardSize) => {
        setCardSize(size);
        localStorage.setItem(CARD_SIZE_KEY, size);
        updateUserSettings.mutate({cardSize: size});
    };

    const handleAnimationSpeedChange = (speed: AnimationSpeed) => {
        setAnimationSpeed(speed);
        localStorage.setItem(ANIMATION_SPEED_KEY, speed);
    };

    const handleAddEntry = () => {
        if (userSettings && !userSettings.hasSeenTranslateHint) {
            setTranslateHintOpen(true);
        } else {
            setAddOpen(true);
        }
    };

    const handleDismissHint = () => {
        setTranslateHintOpen(false);
        updateUserSettings.mutate({hasSeenTranslateHint: true});
        setAddOpen(true);
    };

    const {data: entries = [], isLoading, error, refetch} = useWatchEntries(
        statusFilter !== null ? statusFilter : undefined,
        activeGroupId,
        { enabled: !!session && activeGroupId !== undefined, retry: false, placeholderData: keepPreviousData },
    );

    const deleteMutation = useDeleteWatchEntry();
    const restoreMutation = useRestoreWatchEntry();
    const [deleteTargetEntry, setDeleteTargetEntry] = useState<WatchEntryDto | null>(null);
    const [showArchive, setShowArchive] = useState(false);
    const [viewTransitioning, setViewTransitioning] = useState(false);
    const transitionTimer = useRef<ReturnType<typeof setTimeout>>(null);

    const animatedViewSwitch = useCallback((action: () => void) => {
        if (viewTransitioning) return;
        const ms = animDuration * 1000;
        if (ms === 0) {
            action();
            return;
        }
        setViewTransitioning(true);
        transitionTimer.current = setTimeout(() => {
            action();
            setViewTransitioning(false);
        }, ms);
    }, [viewTransitioning, animDuration]);

    const handleToggleArchive = useCallback(() => {
        animatedViewSwitch(() => setShowArchive(prev => !prev));
    }, [animatedViewSwitch]);

    const handleStatusFilter = useCallback((status: WatchStatus | null) => {
        if (status === statusFilter) return;
        animatedViewSwitch(() => setStatusFilter(status));
    }, [animatedViewSwitch, statusFilter]);

    const removeAndMutate = useCallback((id: number, mutation: "delete" | "restore", isArchived?: boolean) => {
        queryClient.setQueriesData<WatchEntryDto[]>({ queryKey: ["watchEntries"] }, (old) =>
            old ? old.filter(e => e.id !== id) : old
        );
        queryClient.setQueriesData<WatchEntryDto[]>({ queryKey: ["archivedEntries"] }, (old) =>
            old ? old.filter(e => e.id !== id) : old
        );
        if (mutation === "delete") {
            deleteMutation.mutate(id, {
                onSuccess: () => toast.success(
                    isArchived ? t("deleteSucess") : t("archivedSuccess"),
                    { position: "top-center" }
                ),
                onError: () => toast.error(t("deleteError"), { position: "top-center" }),
            });
        } else {
            restoreMutation.mutate(id, {
                onSuccess: () => toast.success(t("restoreSuccess"), { position: "top-center" }),
                onError: () => toast.error(t("restoreError"), { position: "top-center" }),
            });
        }
    }, [queryClient, deleteMutation, restoreMutation, t]);

    const {data: archivedEntries = [], isLoading: isArchivedLoading} = useArchivedEntries(
        activeGroupId,
        { enabled: !!session && activeGroupId !== undefined && showArchive },
    );

    const prefetchArchive = useCallback(() => {
        if (showArchive || !session || activeGroupId === undefined) return;
        const query: { groupId?: number } = {};
        if (activeGroupId !== undefined) query.groupId = activeGroupId;
        queryClient.prefetchQuery({
            queryKey: queryKeys.archivedEntries(activeGroupId),
            queryFn: async () => (await apiClient.api.watchEntriesArchivedList(query)).data,
        });
    }, [showArchive, session, activeGroupId, queryClient]);

    const handleQuickStatusChange = async (entry: WatchEntryDto, targetStatus: WatchStatus, rewatchIncrement?: boolean) => {
        try {
            await apiClient.api.watchEntriesUpdate(entry.id!, {
                status: targetStatus,
                ...(rewatchIncrement ? { rewatchCount: (entry.rewatchCount ?? 0) + 1 } : {}),
            });
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            toast.success(t("postUpdated"), { position: "top-center" });
        } catch {
            toast.error(t("failedToUpdate"), { position: "top-center" });
        }
    };

    // Show toast notification on error
    useEffect(() => {
        if (error) {
            toast.error(t("errorLoadingEntries"), { position: "top-center" });
        }
    }, [error, t]);

    if (authStatus === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (!session) {
        // Check if user was recently logged in (within last 30 days)
        if (typeof window !== "undefined") {
            const RECENT_LOGIN_WINDOW_DAYS = 30;
            const wasLoggedIn = localStorage.getItem("wasLoggedIn");
            if (wasLoggedIn) {
                try {
                    const logoutDate = new Date(wasLoggedIn);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - RECENT_LOGIN_WINDOW_DAYS);
                    
                    if (!isNaN(logoutDate.getTime()) && logoutDate > thirtyDaysAgo) {
                        // User was recently logged in, redirect to login
                        router.push("/login");
                        return null;
                    }
                } catch (error) {
                    // Invalid date in localStorage, treat as new user
                    console.warn("Invalid wasLoggedIn date in localStorage:", error);
                }
            }
        }
        
        // New user or logged out long ago, redirect to landing
        router.push("/landing");
        return null;
    }

    return (
        <div className="min-h-screen">
            <main className="container mx-auto px-4 py-4">

                <div className="flex flex-wrap justify-between">
                    <div className="flex flex-wrap gap-2 mb-6" data-locale-animate-immediate>
                        <Button
                            variant={statusFilter === null ? "default" : "outline"}
                            size="sm"
                            className="min-w-[5rem]"
                            onClick={() => handleStatusFilter(null)}
                        >
                            {t("all")}
                        </Button>
                        {Object.entries(watchStatusLabels).map(([value, label]) => (
                            <Button
                                key={value}
                                variant={statusFilter === value ? "default" : "outline"}
                                size="sm"
                                className="min-w-[9rem]"
                                onClick={() => handleStatusFilter(value as WatchStatus)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-start gap-2 mb-6">
                        {canCreate && !isLoading && !isGroupsLoading && (
                            <Button className="min-w-[12rem]" onClick={handleAddEntry}>
                                <Plus className="h-4 w-4 mr-1.5"/>
                                {t("addEntry")}
                            </Button>
                        )}
                        <Button
                            variant={showArchive ? "default" : "outline"}
                            size="icon"
                            onClick={handleToggleArchive}
                            onMouseEnter={prefetchArchive}
                            title={t("archive")}
                        >
                            <Archive className="h-4 w-4"/>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSettingsOpen(true)}
                            title={t("settings")}
                        >
                            <Settings className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>

                {showArchive ? (
                    isArchivedLoading ? (
                        <div className={gridClasses[cardSize]}>
                            {Array.from({length: skeletonCounts[cardSize]}).map((_, i) => (
                                <CardSkeleton key={i} size={cardSize}/>
                            ))}
                        </div>
                    ) : archivedEntries.length === 0 ? (
                        <div className="text-center py-12">
                            <Archive className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4"/>
                            <p className="text-muted-foreground">{t("noArchivedEntries")}</p>
                        </div>
                    ) : (
                        <div className={gridClasses[cardSize]}>
                            <AnimatePresence mode="popLayout">
                            {archivedEntries.map((entry, index) => {
                                if (!entry.movie) return null;
                                const movie = entry.movie;
                                const posterSrc = getPosterUrl(movie.posterUrl);
                                return (
                                    <motion.div
                                        key={entry.id}
                                        layout={animationSpeed !== "off"}
                                        initial={animationSpeed !== "off" ? { opacity: 0, scale: 0 } : false}
                                        animate={viewTransitioning
                                            ? { opacity: 0, scale: 0 }
                                            : { opacity: 1, scale: 1 }
                                        }
                                        exit={{ opacity: 0, scale: 0, transition: { duration: animDuration, ease: [0.4, 0, 1, 1] } }}
                                        transition={{ duration: animDuration, layout: { type: "spring", stiffness: 400, damping: 30 } }}
                                    >
                                    <Card
                                        className="h-full overflow-hidden grid grid-rows-[auto_1fr] gap-0 py-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                                    >
                                        {posterSrc ? (
                                            <PosterImage src={posterSrc} alt={movie.title ?? undefined}/>
                                        ) : (
                                            <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                                                <ImageOff className="h-10 w-10 text-muted-foreground/40"/>
                                            </div>
                                        )}

                                        <CardContent className={cardContentPadding[cardSize]} data-locale-animate style={{ '--card-index': index } as React.CSSProperties}>
                                            <div className="min-w-0">
                                                <div className={`flex items-start justify-between gap-2 ${metaSpacing[cardSize]}`}>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className={cardTitleClasses[cardSize]} title={movie.title ?? undefined}>
                                                            {movie.title}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap min-w-0">
                                                            <Film className="h-3 w-3 shrink-0"/>
                                                            {contentTypeLabels[movie.type! as EntryContentType]}
                                                            {movie.year && (
                                                                <>
                                                                    <Calendar className="h-3 w-3 ml-1 shrink-0"/>
                                                                    {movie.year}
                                                                </>
                                                            )}
                                                            {movie.genre && (
                                                                <>
                                                                    <Tag className="h-3 w-3 ml-1 shrink-0"/>
                                                                    <span className="truncate">{translateGenre(movie.genre, locale)}</span>
                                                                </>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`flex flex-wrap items-center gap-1.5 ${metaSpacing[cardSize]}`}>
                                                    <Badge
                                                        variant="outline"
                                                        className={statusColors[entry.status!]}
                                                    >
                                                        {watchStatusLabels[entry.status!]}
                                                    </Badge>
                                                    {entry.archivedAt && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Archive className="h-3 w-3"/>
                                                            {new Date(entry.archivedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                {entry.ratings && entry.ratings.length > 0 && (() => {
                                                    const sorted = [...entry.ratings].sort((a, b) =>
                                                        (a.displayName ?? "").localeCompare(b.displayName ?? "")
                                                    );
                                                    return (
                                                        <div className={`flex flex-wrap gap-x-3 gap-y-1 text-sm ${metaSpacing[cardSize]}`}>
                                                            {sorted.slice(0, 3).map((r) => (
                                                                <span key={r.id} className="flex items-center gap-1 min-w-0">
                                                                  <Star className="h-3.5 w-3.5 text-yellow-400 shrink-0"/>
                                                                  <span className="text-muted-foreground truncate max-w-[80px]">{r.displayName}:</span>
                                                                  <strong className="shrink-0">{(r.rating ?? 0)/2}/10</strong>
                                                                </span>
                                                            ))}
                                                            {sorted.length > 3 && (
                                                                <span className="text-xs text-muted-foreground self-center">
                                                                  +{sorted.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {movie.description && (
                                                    <p className={descriptionLines[cardSize]} title={movie.description}>
                                                        {movie.description.length > descriptionLength[cardSize] ? movie.description.slice(0, descriptionLength[cardSize]) + "..." : movie.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-3 shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 h-8 text-xs"
                                                    onClick={() => removeAndMutate(entry.id!, "restore")}
                                                >
                                                    <ArchiveRestore className="h-3.5 w-3.5 mr-1.5"/>
                                                    {t("restore")}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                    onClick={() => setDeleteTargetEntry(entry)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    </motion.div>
                                );
                            })}
                            </AnimatePresence>
                        </div>
                    )
                ) : (isLoading || isGroupsLoading) ? (
                    <div className={gridClasses[cardSize]}>
                        {Array.from({length: skeletonCounts[cardSize]}).map((_, i) => (
                            <CardSkeleton key={i} size={cardSize}/>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4"/>
                        <p className="text-muted-foreground mb-4">{t("errorLoadingEntries")}</p>
                        <Button onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 mr-1.5"/>
                            {t("retryLoad")}
                        </Button>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="text-center py-12">
                        <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4"/>
                        <p className="text-muted-foreground mb-4">{t("noEntries")}</p>
                        {canCreate && (
                        <Button onClick={handleAddEntry}>
                            <Plus className="h-4 w-4 mr-1.5"/>
                            {t("addFirstEntry")}
                        </Button>
                        )}
                    </div>
                ) : (
                    <div className={gridClasses[cardSize]}>
                        <AnimatePresence mode="popLayout">
                        {entries.map((entry, index) => {
                            if (!entry.movie) return null;
                            const movie = entry.movie;
                            const posterSrc = getPosterUrl(movie.posterUrl);
                            return (
                                <motion.div
                                    key={entry.id}
                                    layout={animationSpeed !== "off"}
                                    initial={animationSpeed !== "off" ? { opacity: 0, scale: 0 } : false}
                                    animate={viewTransitioning
                                        ? { opacity: 0, scale: 0 }
                                        : { opacity: 1, scale: 1 }
                                    }
                                    exit={{ opacity: 0, scale: 0, transition: { duration: animDuration, ease: [0.4, 0, 1, 1] } }}
                                    transition={{ duration: animDuration, layout: { type: "spring", stiffness: 400, damping: 30 } }}
                                >
                                <Card
                                    className="h-full cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden grid grid-rows-[auto_1fr] gap-0 py-0"
                                    onClick={() => setEditEntry(entry)}
                                >
                                    {posterSrc ? (
                                        <PosterImage src={posterSrc} alt={movie.title ?? undefined}/>
                                    ) : (
                                        <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                                            <ImageOff className="h-10 w-10 text-muted-foreground/40"/>
                                        </div>
                                    )}

                                    <CardContent className={cardContentPadding[cardSize]} data-locale-animate style={{ '--card-index': index } as React.CSSProperties}>
                                        <div className="min-w-0">
                                            <div className={`flex items-start justify-between gap-2 ${metaSpacing[cardSize]}`}>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className={cardTitleClasses[cardSize]} title={movie.title ?? undefined}>
                                                        {movie.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap min-w-0">
                                                        <Film className="h-3 w-3 shrink-0"/>
                                                        {contentTypeLabels[movie.type! as EntryContentType]}
                                                        {movie.year && (
                                                            <>
                                                                <Calendar className="h-3 w-3 ml-1 shrink-0"/>
                                                                {movie.year}
                                                            </>
                                                        )}
                                                        {movie.genre && (
                                                            <>
                                                                <Tag className="h-3 w-3 ml-1 shrink-0"/>
                                                                <span className="truncate">{translateGenre(movie.genre, locale)}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={`flex flex-wrap items-center gap-1.5 ${metaSpacing[cardSize]}`}>
                                                <Badge
                                                    variant="outline"
                                                    className={statusColors[entry.status!]}
                                                >
                                                    {watchStatusLabels[entry.status!]}
                                                </Badge>
                                                {entry.status === WatchStatus.Completed && entry.rewatchCount != null && entry.rewatchCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 text-violet-400">
                                                        <RefreshCw className="h-3 w-3" />
                                                        <span className="text-xs font-medium">{entry.rewatchCount}</span>
                                                    </span>
                                                )}
                                            </div>
                                            {(entry.status === WatchStatus.Watching || entry.status === WatchStatus.Dropped) && (
                                                (entry.currentEpisode || entry.currentSeason || entry.watchingTime || entry.runtimeSeconds) && (() => {
                                                    const isSeries = movie.type === EntryContentType.Series ||
                                                        movie.type === EntryContentType.Anime ||
                                                        movie.type === EntryContentType.Cartoon;
                                                    const hasEpisodeProgress = isSeries && entry.currentEpisode && entry.totalEpisodes && entry.totalEpisodes > 0;
                                                    const hasTimeProgress = entry.watchingTime && entry.runtimeSeconds && entry.runtimeSeconds > 0;
                                                    const timeProgressPct = hasTimeProgress
                                                        ? Math.min(100, (entry.watchingTime! / entry.runtimeSeconds!) * 100)
                                                        : 0;
                                                    const episodeProgressPct = hasEpisodeProgress
                                                        ? Math.min(100, (entry.currentEpisode! / entry.totalEpisodes!) * 100)
                                                        : 0;
                                                    // For series: episode bar; for movies: time bar
                                                    const showBar = isSeries ? hasEpisodeProgress : hasTimeProgress;
                                                    const barPct = isSeries ? episodeProgressPct : timeProgressPct;
                                                    const isDropped = entry.status === WatchStatus.Dropped;
                                                    const barColor = isDropped ? "bg-red-500" : "bg-yellow-500";

                                                    return (
                                                        <div className={`${metaSpacing[cardSize]} space-y-1.5`}>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {isSeries && (entry.currentSeason || entry.currentEpisode) && (
                                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isDropped ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                                                                        <Play className="h-3 w-3"/>
                                                                        {entry.currentSeason ? `S${entry.currentSeason}` : ""}{entry.currentEpisode ? ` E${entry.currentEpisode}` : ""}
                                                                    </span>
                                                                )}
                                                                {entry.watchingTime && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <Clock className="h-3 w-3"/>
                                                                        {formatWatchingTime(entry.watchingTime)}
                                                                        {entry.runtimeSeconds ? ` / ${formatSecondsToHMS(entry.runtimeSeconds)}` : ""}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {showBar && (
                                                                <HoverCard openDelay={300} closeDelay={150}>
                                                                    <HoverCardTrigger asChild>
                                                                        <div className="relative w-full cursor-pointer -my-1.5 py-1.5 -mx-2 px-2">
                                                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                                                <div
                                                                                    className={`${barColor} h-full rounded-full transition-all`}
                                                                                    style={{width: `${barPct}%`}}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </HoverCardTrigger>
                                                                    <HoverCardContent side="top" align="start" className="w-auto min-w-[200px] p-3 text-sm space-y-1.5">
                                                                        {/* Series: season, episode, episode progress */}
                                                                        {isSeries && (
                                                                            <>
                                                                                {entry.currentSeason && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-muted-foreground">{t("season")}</span>
                                                                                        <span className="font-medium">
                                                                                            {entry.currentSeason}{entry.totalSeasons ? ` / ${entry.totalSeasons}` : ""}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {hasEpisodeProgress && (
                                                                                    <>
                                                                                        <div className="flex justify-between gap-4">
                                                                                            <span className="text-muted-foreground">{t("episode")}</span>
                                                                                            <span className="font-medium">{entry.currentEpisode} / {entry.totalEpisodes}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between gap-4">
                                                                                            <span className="text-muted-foreground">{t("progress")}</span>
                                                                                            <span className="font-medium">{Math.round(episodeProgressPct)}%</span>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {/* Time section: duration, watching time, time progress */}
                                                                        {(entry.watchingTime || entry.runtimeSeconds) && (
                                                                            <>
                                                                                {isSeries && <div className="border-t border-border my-1" />}
                                                                                {entry.runtimeSeconds && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-muted-foreground">
                                                                                            {isSeries ? t("episodeDuration") : t("runtimeSeconds")}
                                                                                        </span>
                                                                                        <span className="font-medium">{formatSecondsToHMS(entry.runtimeSeconds)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {entry.watchingTime && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-muted-foreground">{t("watchingTime")}</span>
                                                                                        <span className="font-medium">{formatWatchingTime(entry.watchingTime)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {hasTimeProgress && (
                                                                                    <div className="space-y-1 pt-0.5">
                                                                                        <div className="flex justify-between gap-4">
                                                                                            <span className="text-muted-foreground">{t("timeProgress")}</span>
                                                                                            <span className="font-medium">{Math.round(timeProgressPct)}%</span>
                                                                                        </div>
                                                                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                                                            <div
                                                                                                className="bg-blue-500 h-full rounded-full transition-all"
                                                                                                style={{width: `${timeProgressPct}%`}}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </HoverCardContent>
                                                                </HoverCard>
                                                            )}
                                                        </div>
                                                    );
                                                })()
                                            )}

                                            {entry.ratings && entry.ratings.length > 0 && (() => {
                                                const sorted = [...entry.ratings].sort((a, b) =>
                                                    (a.displayName ?? "").localeCompare(b.displayName ?? "")
                                                );
                                                return (
                                                    <div className={`flex flex-wrap gap-x-3 gap-y-1 text-sm ${metaSpacing[cardSize]}`}>
                                                        {sorted.slice(0, 3).map((r) => (
                                                            <span key={r.id} className="flex items-center gap-1 min-w-0">
                                                              <Star className="h-3.5 w-3.5 text-yellow-400 shrink-0"/>
                                                              <span
                                                                  className="text-muted-foreground truncate max-w-[80px]">{r.displayName}:</span>
                                                              <strong className="shrink-0">{(r.rating ?? 0)/2}/10</strong>
                                                            </span>
                                                        ))}
                                                        {sorted.length > 3 && (
                                                            <span className="text-xs text-muted-foreground self-center">
                                                              +{sorted.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {movie.description && (
                                                <p className={descriptionLines[cardSize]} title={movie.description}>
                                                    {movie.description.length > descriptionLength[cardSize] ? movie.description.slice(0, descriptionLength[cardSize]) + "..." : movie.description}
                                                </p>
                                            )}

                                            {entry.comment && (
                                                <p className={commentLines[cardSize]}>
                                                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0"/>
                                                    <span className="min-w-0 break-words">{entry.comment.length > commentLength[cardSize] ? entry.comment.slice(0, commentLength[cardSize]) + "..." : entry.comment}</span>
                                                </p>
                                            )}
                                        </div>
                                        {(canEditEntry(entry) || canDeleteEntry(entry)) && (
                                            <div className="pt-3 shrink-0 flex justify-end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size={dropdownTriggerSize[cardSize]} className="bg-background">
                                                            <EllipsisVertical className={dropdownIconClasses[cardSize]} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent side="top" align="end" className={dropdownContentClasses[cardSize]}>
                                                        {canEditEntry(entry) && entry.status === WatchStatus.Considering && (
                                                            <>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Planned]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Planned)}>
                                                                    <Clock className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Planned]}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Dropped]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                                    <XCircle className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Dropped]}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {canEditEntry(entry) && entry.status === WatchStatus.Planned && (
                                                            <>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Watching]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Watching)}>
                                                                    <PlayCircle className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Watching]}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Dropped]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                                    <XCircle className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Dropped]}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {canEditEntry(entry) && entry.status === WatchStatus.Watching && (
                                                            <>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Completed]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Completed)}>
                                                                    <CheckCircle2 className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Completed]}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Dropped]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                                    <XCircle className={dropdownIconClasses[cardSize]} />
                                                                    {watchStatusLabels[WatchStatus.Dropped]}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {canEditEntry(entry) && entry.status === WatchStatus.Completed && (
                                                            <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Watching]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Watching, true)}>
                                                                <RefreshCw className={dropdownIconClasses[cardSize]} />
                                                                {t("quickActionRewatch")}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEditEntry(entry) && entry.status === WatchStatus.Dropped && (
                                                            <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} ${statusMenuItemColors[WatchStatus.Planned]}`} onSelect={() => handleQuickStatusChange(entry, WatchStatus.Planned)}>
                                                                <Clock className={dropdownIconClasses[cardSize]} />
                                                                {watchStatusLabels[WatchStatus.Planned]}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDeleteEntry(entry) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className={`${dropdownItemClasses[cardSize]} text-muted-foreground focus:text-muted-foreground`} onSelect={() => setDeleteTargetEntry(entry)}>
                                                                    <Archive className={dropdownIconClasses[cardSize]} />
                                                                    {t("archive")}
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>
                )}

                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t("displaySettings")}</DialogTitle>
                            <DialogDescription>{t("displaySettingsDescription")}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>{t("cardSize")}</FieldLabel>
                                <FieldDescription>{t("cardSizeDescription")}</FieldDescription>
                                <Hitbox size="lg" position="vertical">
                                    <Slider
                                        min={0}
                                        max={2}
                                        step={1}
                                        value={[cardSizeSteps.indexOf(cardSize)]}
                                        onValueChange={([v]) => handleCardSizeChange(cardSizeSteps[v])}
                                    />
                                </Hitbox>
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{t("cardSizeSmall")}</span>
                                    <span>{t("cardSizeMedium")}</span>
                                    <span>{t("cardSizeLarge")}</span>
                                </div>
                            </Field>
                            <Field>
                                <FieldLabel>{t("animationSpeed")}</FieldLabel>
                                <FieldDescription>{t("animationSpeedDescription")}</FieldDescription>
                                <Hitbox size="lg" position="vertical">
                                    <Slider
                                        min={0}
                                        max={3}
                                        step={1}
                                        value={[animSpeedSteps.indexOf(animationSpeed)]}
                                        onValueChange={([v]) => handleAnimationSpeedChange(animSpeedSteps[v])}
                                    />
                                </Hitbox>
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{t("animationSpeedOff")}</span>
                                    <span>{t("animationSpeedSlow")}</span>
                                    <span>{t("animationSpeedNormal")}</span>
                                    <span>{t("animationSpeedFast")}</span>
                                </div>
                                <div className="flex items-center justify-center h-16 mt-2 rounded-md border border-dashed border-muted-foreground/25 bg-muted/30">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={animationSpeed}
                                            className="h-8 w-24 rounded-md bg-primary/20 border border-primary/40"
                                            initial={animationSpeed !== "off" ? { opacity: 0, scale: 0.8 } : false}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={animationSpeed !== "off" ? {
                                                duration: animationDurations[animationSpeed],
                                                repeat: Infinity,
                                                repeatType: "reverse",
                                                repeatDelay: 0.5,
                                            } : undefined}
                                        />
                                    </AnimatePresence>
                                </div>
                            </Field>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={translateHintOpen} onOpenChange={setTranslateHintOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                {t("translateHintTitle")}
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            {t("translateHintBody")}
                        </p>
                        <Button onClick={handleDismissHint} className="w-full">
                            {t("translateHintDismiss")}
                        </Button>
                    </DialogContent>
                </Dialog>

                <AddEntryDialog open={addOpen} onOpenChange={setAddOpen}/>
                {editEntry && (
                    <EditEntryDialog
                        entry={editEntry}
                        open={!!editEntry}
                        onOpenChange={(open) => {
                            if (!open) setEditEntry(null);
                        }}
                    />
                )}
                <ConfirmDialog
                    trigger={<span className="hidden" />}
                    open={!!deleteTargetEntry}
                    onOpenChange={(open) => { if (!open) setDeleteTargetEntry(null); }}
                    onConfirm={() => {
                        if (deleteTargetEntry) {
                            const target = deleteTargetEntry;
                            setDeleteTargetEntry(null);
                            removeAndMutate(target.id!, "delete", target.isArchived);
                        } else {
                            setDeleteTargetEntry(null);
                        }
                    }}
                    title={deleteTargetEntry?.isArchived ? t("delete") : t("archive")}
                    description={deleteTargetEntry?.isArchived ? t("deleteFromArchiveConfirm") : t("archiveConfirm")}
                    confirmText={deleteTargetEntry?.isArchived ? t("delete") : t("archive")}
                    cancelText={t("cancel")}
                    variant="destructive"
                    icon={deleteTargetEntry?.isArchived ? <Trash2 className="h-6 w-6" /> : <Archive className="h-6 w-6" />}
                />
            </main>
        </div>
    );
}