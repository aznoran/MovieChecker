"use client";

import {useState, useEffect} from "react";
import {useQuery, useMutation, useQueryClient, keepPreviousData} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {ConfirmDialog} from "@/components/confirm-dialog";
import {getWatchEntries, deleteWatchEntry, getPosterUrl} from "@/lib/api";
import {WatchStatus, EmotionEmojis, GroupRole, GroupType} from "@/types";
import type {WatchEntry} from "@/types";
import {
    getContentTypeLabels,
    getWatchStatusLabels,
    translateGenre,
} from "@/lib/i18n/labels";
import {AddEntryDialog} from "@/components/add-entry-dialog";
import {EditEntryDialog} from "@/components/edit-entry-dialog";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
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
} from "lucide-react";
import {toast} from "sonner";

const statusColors: Record<WatchStatus, string> = {
    [WatchStatus.Planned]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    [WatchStatus.Watching]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    [WatchStatus.Completed]: "bg-green-500/20 text-green-400 border-green-500/30",
    [WatchStatus.Dropped]: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const dynamic = "force-dynamic";

export default function HomePage() {
    const {isAuthenticated, isLoading: authLoading, user} = useAuth();
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup} = useGroup();
    const router = useRouter();
    const queryClient = useQueryClient();

    const contentTypeLabels = getContentTypeLabels(locale);
    const watchStatusLabels = getWatchStatusLabels(locale);

    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;
    const currentMember = activeGroup?.members.find(m => m.userId === user?.id);

    // Check if user can delete/edit an entry based on their role
    const canModifyEntry = (entry: WatchEntry): boolean => {
        if (!isGroupMode) return true; // Personal mode: always can modify own entries
        if (!currentMember) return false;
        if (currentMember.role >= GroupRole.Admin) return true; // Owner/Admin can modify all
        if (currentMember.role === GroupRole.Member) return entry.ratings?.some(r => r.userId === user?.id) || false;
        return false; // Viewer cannot modify
    };

    // Check if user can create entries
    const canCreate = !isGroupMode || (currentMember !== undefined && currentMember.role >= GroupRole.Member);

    const [addOpen, setAddOpen] = useState(false);
    const [editEntry, setEditEntry] = useState<WatchEntry | null>(null);
    const [statusFilter, setStatusFilter] = useState<WatchStatus | null>(null);

    const {data: entries = [], isLoading, error, refetch} = useQuery({
        queryKey: ["watchEntries", statusFilter, activeGroupId],
        queryFn: () =>
            getWatchEntries(statusFilter !== null ? statusFilter : undefined, activeGroupId),
        enabled: isAuthenticated,
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

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (!isAuthenticated) {
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
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Popcorn className="h-6 w-6"/>
                        {t("movieDiary")}
                    </h1>
                    {canCreate && (
                        <Button className="min-w-[12rem]"  onClick={() => setAddOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5"/>
                            {t("addEntry")}
                        </Button>
                    )}
                </div>

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
                            variant={statusFilter === Number(value) ? "default" : "outline"}
                            size="sm"
                            className="min-w-[9rem]"
                            onClick={() => setStatusFilter(Number(value) as WatchStatus)}
                        >
                            {label}
                        </Button>
                    ))}
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
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {entries.map((entry) => {
                            const posterSrc = getPosterUrl(entry.movie.posterUrl);
                            return (
                                <Card
                                    key={entry.id}
                                    className="cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden grid grid-rows-[auto_1fr] gap-0 py-0"
                                    onClick={() => setEditEntry(entry)}
                                >
                                    {posterSrc ? (
                                        <div className="w-full aspect-[4/3] overflow-hidden">
                                            <img
                                                src={posterSrc}
                                                alt={entry.movie.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                                            <ImageOff className="h-10 w-10 text-muted-foreground/40"/>
                                        </div>
                                    )}

                                    <CardContent className="p-4 flex flex-col justify-between min-h-0 overflow-hidden">
                                        <div className="min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-4">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold mb-2 truncate" title={entry.movie.title}>
                                                        {entry.movie.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap min-w-0">
                                                        <Film className="h-3 w-3 shrink-0"/>
                                                        {contentTypeLabels[entry.movie.type]}
                                                        {entry.movie.year && (
                                                            <>
                                                                <Calendar className="h-3 w-3 ml-1 shrink-0"/>
                                                                {entry.movie.year}
                                                            </>
                                                        )}
                                                        {entry.movie.genre && (
                                                            <>
                                                                <Tag className="h-3 w-3 ml-1 shrink-0"/>
                                                                <span className="truncate">{translateGenre(entry.movie.genre, locale)}</span>
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                {entry.emotion !== undefined && entry.emotion !== null && (
                                                    <span className="text-xl shrink-0">
                                                      {EmotionEmojis[entry.emotion]}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                                <Badge
                                                    variant="outline"
                                                    className={statusColors[entry.status]}
                                                >
                                                    {watchStatusLabels[entry.status]}
                                                </Badge>
                                            </div>
                                            {entry.status === WatchStatus.Watching && (
                                                (entry.currentEpisode || entry.currentSeason || entry.watchingTime) && (
                                                    <div
                                                        className="text-sm text-muted-foreground mb-4 flex items-start gap-1">
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
                                                    a.displayName.localeCompare(b.displayName)
                                                );
                                                return (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-4">
                                                        {sorted.slice(0, 3).map((r) => (
                                                            <span key={r.id} className="flex items-center gap-1 min-w-0">
                                                              <Star className="h-3.5 w-3.5 text-yellow-400 shrink-0"/>
                                                              <span
                                                                  className="text-muted-foreground truncate max-w-[80px]">{r.displayName}:</span>
                                                              <strong className="shrink-0">{r.rating}/10</strong>
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

                                            {entry.movie.description && (
                                                <p className="text-xs text-muted-foreground mb-4 break-words line-clamp-2" title={entry.movie.description}>
                                                    {entry.movie.description.length > 100 ? entry.movie.description.slice(0, 100) + "..." : entry.movie.description}
                                                </p>
                                            )}

                                            {entry.comment && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 break-words flex items-start gap-1">
                                                    <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0"/>
                                                    <span className="min-w-0 break-words">{entry.comment.length > 100 ? entry.comment.slice(0, 100) + "..." : entry.comment}</span>
                                                </p>
                                            )}
                                        </div>
                                        {canModifyEntry(entry) && (
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
                                                    onConfirm={() => deleteMutation.mutate(entry.id)}
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