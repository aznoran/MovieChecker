"use client";

import { useState, useEffect, useCallback } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { usePermissions } from "@/context/permissions-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getPosterUrl, apiClient } from "@/lib/api";
import { useWatchEntries, useDeleteWatchEntry } from "@/hooks/api";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    HelpCircle,
} from "lucide-react";
import {HoverCard, HoverCardTrigger, HoverCardContent} from "@/components/ui/hover-card";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type CardSize = "small" | "medium" | "large";

const CARD_SIZE_KEY = "moviechecker-card-size";

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

function formatMinutesToHM(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
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
    const [cardSize, setCardSize] = useState<CardSize>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(CARD_SIZE_KEY);
            if (stored === "small" || stored === "medium" || stored === "large") return stored;
        }
        return "medium";
    });

    const handleCardSizeChange = (size: CardSize) => {
        setCardSize(size);
        localStorage.setItem(CARD_SIZE_KEY, size);
    };

    const {data: entries = [], isLoading, error, refetch} = useWatchEntries(
        statusFilter !== null ? statusFilter : undefined,
        activeGroupId,
        { enabled: !!session && activeGroupId !== undefined, retry: false, placeholderData: keepPreviousData },
    );

    const deleteMutation = useDeleteWatchEntry();

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
                    <div className="flex flex-wrap gap-2 mb-6">
                        <Button
                            variant={statusFilter === null ? "default" : "outline"}
                            size="sm"
                            className="min-w-[5rem]"
                            onClick={() => setStatusFilter(null)}
                        >
                            {t("all")}
                        </Button>
                        {Object.entries(watchStatusLabels).map(([value, label]) => (
                            <Button
                                key={value}
                                variant={statusFilter === value ? "default" : "outline"}
                                size="sm"
                                className="min-w-[9rem]"
                                onClick={() => setStatusFilter(value as WatchStatus)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-start gap-2 mb-6">
                        {canCreate && !isLoading && !isGroupsLoading && (
                            <Button className="min-w-[12rem]" onClick={() => setAddOpen(true)}>
                                <Plus className="h-4 w-4 mr-1.5"/>
                                {t("addEntry")}
                            </Button>
                        )}
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

                {(isLoading || isGroupsLoading) ? (
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
                        <Button onClick={() => setAddOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5"/>
                            {t("addFirstEntry")}
                        </Button>
                        )}
                    </div>
                ) : (
                    <div className={gridClasses[cardSize]}>
                        {entries.map((entry) => {
                            if (!entry.movie) return null;
                            const movie = entry.movie;
                            const posterSrc = getPosterUrl(movie.posterUrl);
                            return (
                                <Card
                                    key={entry.id}
                                    className="cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden grid grid-rows-[auto_1fr] gap-0 py-0"
                                    onClick={() => setEditEntry(entry)}
                                >
                                    {posterSrc ? (
                                        <PosterImage src={posterSrc} alt={movie.title ?? undefined}/>
                                    ) : (
                                        <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                                            <ImageOff className="h-10 w-10 text-muted-foreground/40"/>
                                        </div>
                                    )}

                                    <CardContent className={cardContentPadding[cardSize]}>
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
                                                    className={
                                                        entry.status === WatchStatus.Watching && entry.rewatchCount && entry.rewatchCount > 0
                                                            ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                                                            : statusColors[entry.status!]
                                                    }
                                                >
                                                    {entry.status === WatchStatus.Watching && entry.rewatchCount && entry.rewatchCount > 0
                                                        ? `${t("statusWatchingRewatch")} #${entry.rewatchCount}`
                                                        : watchStatusLabels[entry.status!]}
                                                </Badge>
                                            </div>
                                            {(entry.status === WatchStatus.Watching || entry.status === WatchStatus.Dropped) && (
                                                (entry.currentEpisode || entry.currentSeason || entry.watchingTime || entry.runtimeMinutes) && (() => {
                                                    const isSeries = movie.type === EntryContentType.Series ||
                                                        movie.type === EntryContentType.Anime ||
                                                        movie.type === EntryContentType.Cartoon;
                                                    const hasEpisodeProgress = isSeries && entry.currentEpisode && entry.totalEpisodes && entry.totalEpisodes > 0;
                                                    const hasTimeProgress = entry.watchingTime && entry.runtimeMinutes && entry.runtimeMinutes > 0;
                                                    const timeProgressPct = hasTimeProgress
                                                        ? Math.min(100, (entry.watchingTime! / 60 / entry.runtimeMinutes!) * 100)
                                                        : 0;
                                                    const episodeProgressPct = hasEpisodeProgress
                                                        ? Math.min(100, (entry.currentEpisode! / entry.totalEpisodes!) * 100)
                                                        : 0;
                                                    // For series: episode bar; for movies: time bar
                                                    const showBar = isSeries ? hasEpisodeProgress : hasTimeProgress;
                                                    const barPct = isSeries ? episodeProgressPct : timeProgressPct;
                                                    const barColor = isSeries ? "bg-yellow-500" : "bg-blue-500";

                                                    return (
                                                        <div className={`${metaSpacing[cardSize]} space-y-1.5`}>
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {isSeries && (entry.currentSeason || entry.currentEpisode) && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-xs font-medium">
                                                                        <Play className="h-3 w-3"/>
                                                                        {entry.currentSeason ? `S${entry.currentSeason}` : ""}{entry.currentEpisode ? ` E${entry.currentEpisode}` : ""}
                                                                    </span>
                                                                )}
                                                                {entry.watchingTime && (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <Clock className="h-3 w-3"/>
                                                                        {formatWatchingTime(entry.watchingTime)}
                                                                        {entry.runtimeMinutes ? ` / ${formatMinutesToHM(entry.runtimeMinutes)}` : ""}
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
                                                                        {(entry.watchingTime || entry.runtimeMinutes) && (
                                                                            <>
                                                                                {isSeries && <div className="border-t border-border my-1" />}
                                                                                {entry.runtimeMinutes && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-muted-foreground">
                                                                                            {isSeries ? t("episodeDuration") : t("runtimeMinutes")}
                                                                                        </span>
                                                                                        <span className="font-medium">{formatMinutesToHM(entry.runtimeMinutes)}</span>
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
                                            <div className="flex flex-wrap gap-1 pt-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                {canEditEntry(entry) && entry.status === WatchStatus.Considering && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Planned)}>
                                                            <Clock className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Planned]}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                            <XCircle className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Dropped]}
                                                        </Button>
                                                    </>
                                                )}
                                                {canEditEntry(entry) && entry.status === WatchStatus.Planned && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Watching)}>
                                                            <PlayCircle className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Watching]}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                            <XCircle className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Dropped]}
                                                        </Button>
                                                    </>
                                                )}
                                                {canEditEntry(entry) && entry.status === WatchStatus.Watching && (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Completed)}>
                                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Completed]}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Dropped)}>
                                                            <XCircle className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Dropped]}
                                                        </Button>
                                                    </>
                                                )}
                                                {canEditEntry(entry) && entry.status === WatchStatus.Completed && (
                                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Watching, true)}>
                                                        <RefreshCw className="h-3.5 w-3.5 mr-1"/>{t("quickActionRewatch")}
                                                    </Button>
                                                )}
                                                {canEditEntry(entry) && entry.status === WatchStatus.Dropped && (
                                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleQuickStatusChange(entry, WatchStatus.Planned)}>
                                                        <Clock className="h-3.5 w-3.5 mr-1"/>{watchStatusLabels[WatchStatus.Planned]}
                                                    </Button>
                                                )}
                                                {canDeleteEntry(entry) && (
                                                    <ConfirmDialog
                                                        trigger={
                                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                                                                <Trash2 className="h-3.5 w-3.5 mr-1"/>{t("delete")}
                                                            </Button>
                                                        }
                                                        onConfirm={() => deleteMutation.mutate(entry.id!, {
                                                            onSuccess: () => toast.success(t("deleteSucess"), { position: "top-center" }),
                                                            onError: () => toast.error(t("deleteError"), { position: "top-center" }),
                                                        })}
                                                        title={t("delete")}
                                                        description={t("deleteConfirm")}
                                                        confirmText={t("delete")}
                                                        cancelText={t("cancel")}
                                                        variant="destructive"
                                                        icon={<Trash2 className="h-6 w-6" />}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
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
                                <Select value={cardSize} onValueChange={(value) => handleCardSizeChange(value as CardSize)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">{t("cardSizeSmall")}</SelectItem>
                                        <SelectItem value="medium">{t("cardSizeMedium")}</SelectItem>
                                        <SelectItem value="large">{t("cardSizeLarge")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
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
            </main>
        </div>
    );
}