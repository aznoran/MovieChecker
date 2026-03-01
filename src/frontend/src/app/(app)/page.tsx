"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { usePermissions } from "@/context/permissions-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getWatchEntries, deleteWatchEntry, getPosterUrl } from "@/lib/api";
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
    RefreshCw,
    AlertCircle,
    Settings,
} from "lucide-react";
import { toast } from "sonner";

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

const statusColors: Record<WatchStatus, string> = {
    [WatchStatus.Planned]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [WatchStatus.Watching]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    [WatchStatus.Completed]: "bg-green-500/20 text-green-400 border-green-500/30",
    [WatchStatus.Dropped]: "bg-red-500/20 text-red-400 border-red-500/30",
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

export const dynamic = "force-dynamic";

export default function HomePage() {
    const { data: session, status: authStatus } = useSession();
    const {locale, t} = useLocale();
    const {activeGroupId} = useGroup();
    const {permissions} = usePermissions();
    const router = useRouter();
    const queryClient = useQueryClient();

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

    const {data: entries = [], isLoading, error, refetch} = useQuery({
        queryKey: ["watchEntries", statusFilter, activeGroupId],
        queryFn: () =>
            getWatchEntries(statusFilter !== null ? statusFilter : undefined, activeGroupId),
        enabled: !!session,
        retry: false,
        placeholderData: keepPreviousData,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWatchEntry,
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            toast.success(t("deleteSucess"), { position: "top-center"})
        },
        onError: () => {
            queryClient.invalidateQueries({queryKey: ["watchEntries"]});
            toast.error(t("deleteError"), { position: "top-center"})
        },
    });

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
                        {canCreate && (
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

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
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
                                                    className={statusColors[entry.status!]}
                                                >
                                                    {watchStatusLabels[entry.status!]}
                                                </Badge>
                                            </div>
                                            {entry.status === WatchStatus.Watching && (
                                                (entry.currentEpisode || entry.currentSeason || entry.watchingTime) && (
                                                    <div
                                                        className={`text-sm text-muted-foreground ${metaSpacing[cardSize]} flex items-start gap-1`}>
                                                        <Play className="h-3.5 w-3.5 mt-0.5 shrink-0"/>
                                                        <div className="flex flex-wrap gap-1">
                                                            {entry.currentSeason && (
                                                                <span>
                                                                    S{entry.currentSeason}
                                                                </span>
                                                            )}
                                                            {entry.currentEpisode && (
                                                                <span>
                                                                    E{entry.currentEpisode}
                                                                </span>
                                                            )}
                                                            {(entry.currentSeason || entry.currentEpisode) && entry.totalEpisodes && (
                                                                <span className="text-muted-foreground/70">
                                                                    /{entry.totalEpisodes}
                                                                </span>
                                                            )}
                                                            {entry.watchingTime && (
                                                                <span className="ml-1">
                                                                    · {entry.watchingTime} мин
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
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
                                        {canDeleteEntry(entry) && (
                                            <div className="flex justify-end pt-3 shrink-0">
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ConfirmDialog
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-1"/>
                                                                {t("delete")}
                                                            </Button>
                                                        }
                                                        onConfirm={() => deleteMutation.mutate(entry.id!)}
                                                        title={t("delete")}
                                                        description={t("deleteConfirm")}
                                                        confirmText={t("delete")}
                                                        cancelText={t("cancel")}
                                                        variant="destructive"
                                                        icon={<Trash2 className="h-6 w-6" />}
                                                    />
                                                </div>
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