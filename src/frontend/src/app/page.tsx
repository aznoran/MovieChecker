"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { getWatchEntries, deleteWatchEntry, getPosterUrl } from "@/lib/api";
import { WatchStatus, EmotionEmojis } from "@/types";
import type { WatchEntry } from "@/types";
import {
  getContentTypeLabels,
  getWatchStatusLabels,
  getWatchedByLabels,
} from "@/lib/i18n/labels";
import { Navigation } from "@/components/navigation";
import { AddEntryDialog } from "@/components/add-entry-dialog";
import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const statusColors: Record<WatchStatus, string> = {
  [WatchStatus.Planned]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  [WatchStatus.Watching]: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  [WatchStatus.Completed]: "bg-green-500/20 text-green-400 border-green-500/30",
  [WatchStatus.Dropped]: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { locale, t } = useLocale();
  const { activeGroupId } = useGroup();
  const router = useRouter();
  const queryClient = useQueryClient();

  const contentTypeLabels = getContentTypeLabels(locale);
  const watchStatusLabels = getWatchStatusLabels(locale);
  const watchedByLabels = getWatchedByLabels(locale);

  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WatchEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<WatchStatus | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["watchEntries", statusFilter, activeGroupId],
    queryFn: () =>
      getWatchEntries(statusFilter !== null ? statusFilter : undefined, undefined, activeGroupId),
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWatchEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Popcorn className="h-6 w-6" />
            {t("movieDiary")}
          </h1>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("addEntry")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={statusFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            {t("all")}
          </Button>
          {Object.entries(watchStatusLabels).map(([value, label]) => (
            <Button
              key={value}
              variant={statusFilter === Number(value) ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(Number(value) as WatchStatus)}
            >
              {label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{t("noEntries")}</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t("addFirstEntry")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const posterSrc = getPosterUrl(entry.movie.posterUrl);
              return (
                <Card
                  key={entry.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50 overflow-hidden"
                  onClick={() => setEditEntry(entry)}
                >
                  {posterSrc ? (
                    <div className="w-full h-44 overflow-hidden">
                      <img
                        src={posterSrc}
                        alt={entry.movie.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-28 bg-muted flex items-center justify-center">
                      <ImageOff className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {entry.movie.title}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          <Film className="h-3 w-3" />
                          {contentTypeLabels[entry.movie.type]}
                          {entry.movie.year && (
                            <>
                              <Calendar className="h-3 w-3 ml-1" />
                              {entry.movie.year}
                            </>
                          )}
                          {entry.movie.genre && (
                            <>
                              <Tag className="h-3 w-3 ml-1" />
                              {entry.movie.genre}
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

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge
                        variant="outline"
                        className={statusColors[entry.status]}
                      >
                        {watchStatusLabels[entry.status]}
                      </Badge>
                      <Badge variant="secondary">
                        {watchedByLabels[entry.watchedBy]}
                      </Badge>
                    </div>

                    {entry.ratings && entry.ratings.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-2">
                        {entry.ratings.slice(0, 3).map((r) => (
                          <span key={r.id} className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-muted-foreground">{r.displayName}:</span>
                            <strong>{r.rating}/10</strong>
                          </span>
                        ))}
                        {entry.ratings.length > 3 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{entry.ratings.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {entry.comment && (
                      <p className="text-sm text-muted-foreground line-clamp-2 flex items-start gap-1">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {entry.comment}
                      </p>
                    )}

                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t("deleteConfirm"))) {
                            deleteMutation.mutate(entry.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t("delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AddEntryDialog open={addOpen} onOpenChange={setAddOpen} />
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
