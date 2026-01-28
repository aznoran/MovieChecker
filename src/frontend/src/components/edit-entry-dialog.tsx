"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWatchEntry, updateMovie, uploadPoster, getPosterUrl } from "@/lib/api";
import { useLocale } from "@/context/locale-context";
import { useAuth } from "@/context/auth-context";
import { useGroup } from "@/context/group-context";
import type { WatchEntry } from "@/types";
import {
  WatchStatus,
  WatchedBy,
  Emotion,
  EmotionEmojis,
} from "@/types";
import {
  getContentTypeLabels,
  getWatchStatusLabels,
  getWatchedByLabels,
} from "@/lib/i18n/labels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Props {
  entry: WatchEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEntryDialog({ entry, open, onOpenChange }: Props) {
  const { locale, t } = useLocale();
  const { user } = useAuth();
  const { activeGroupId, activeGroup } = useGroup();
  const isGroupMode = !!entry.groupId && !!activeGroup;

  const [status, setStatus] = useState<WatchStatus>(entry.status);
  const [watchedBy, setWatchedBy] = useState<WatchedBy>(entry.watchedBy);
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
      entry.ratings?.forEach((r) => { map[r.userId] = r.rating.toString(); });
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

  const contentTypeLabels = getContentTypeLabels(locale);
  const watchStatusLabels = getWatchStatusLabels(locale);
  const watchedByLabels = getWatchedByLabels(locale);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (posterFile) {
        const posterUrl = await uploadPoster(posterFile);
        await updateMovie(entry.movieId, { posterUrl });
      }

      const ratingsArray = isGroupMode
        ? selectedMembers
            .filter((uid) => memberRatings[uid])
            .map((uid) => ({ userId: uid, rating: parseInt(memberRatings[uid]) }))
        : undefined;

      await updateWatchEntry(entry.id, {
        status,
        watchedBy: isGroupMode ? WatchedBy.Together : watchedBy,
        rating: !isGroupMode && myRating ? parseInt(myRating) : undefined,
        ratings: ratingsArray,
        emotion: emotion ?? undefined,
        comment: comment || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
      onOpenChange(false);
    },
    onError: () => {
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
          const file = new File([blob], `clipboard.${ext}`, { type: imageType });
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
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t("editEntry")}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-lg mb-4 flex items-center gap-3">
          <Film className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <h3 className="font-semibold">{entry.movie.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {contentTypeLabels[entry.movie.type]}
              {entry.movie.year && (
                <>
                  <Calendar className="h-3 w-3 ml-1" />
                  {entry.movie.year}
                </>
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Poster */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImagePlus className="h-4 w-4" />
              {t("poster")}
            </Label>
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
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handlePasteFromClipboard}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={removePoster}
                  >
                    <X className="h-4 w-4" />
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
                  <ImagePlus className="h-8 w-8 mb-2" />
                  <span className="text-sm">{t("clickToUpload")}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors text-muted-foreground"
                >
                  <ClipboardPaste className="h-8 w-8 mb-2" />
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
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              {t("status")}
            </Label>
            <Select
              value={status.toString()}
              onValueChange={(v) => setStatus(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(watchStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGroupMode ? (
            <>
              {/* Group mode: member multi-select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {status === WatchStatus.Planned || status === WatchStatus.Watching
                    ? t("watchingBy")
                    : t("watchedBy")}
                </Label>
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
                              const next = { ...prev };
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
              </div>

              {/* Per-member rating fields */}
              {status !== WatchStatus.Planned && status !== WatchStatus.Watching &&
                selectedMembers.length > 0 && (
                <div className="space-y-2">
                  {selectedMembers.map((uid) => {
                    const member = activeGroup.members.find((m) => m.userId === uid);
                    if (!member) return null;
                    return (
                      <div key={uid} className="flex items-center gap-2">
                        <Label className="flex items-center gap-1.5 min-w-0 shrink-0">
                          <Star className="h-3.5 w-3.5" />
                          {member.displayName}
                        </Label>
                        <Input
                          type="number"
                          value={memberRatings[uid] || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMemberRatings((prev) => {
                              if (v === "") return { ...prev, [uid]: "" };
                              const n = Math.min(10, Math.max(1, parseInt(v) || 1));
                              return { ...prev, [uid]: n.toString() };
                            });
                          }}
                          min="1"
                          max="10"
                          placeholder="1-10"
                          className="w-24 h-8"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Personal mode: watchedBy select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {status === WatchStatus.Planned || status === WatchStatus.Watching
                    ? t("watchingBy")
                    : t("watchedBy")}
                </Label>
                <Select
                  value={watchedBy.toString()}
                  onValueChange={(v) => {
                    setWatchedBy(Number(v) as WatchedBy);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(watchedByLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personal mode: single rating */}
              {status !== WatchStatus.Planned && status !== WatchStatus.Watching && (
                <div className="space-y-2">
                  <Label htmlFor="myRating" className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    {t("myRatingLabel")}
                  </Label>
                  <Input
                    id="myRating"
                    type="number"
                    value={myRating}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setMyRating(""); return; }
                      const n = Math.min(10, Math.max(1, parseInt(v) || 1));
                      setMyRating(n.toString());
                    }}
                    min="1"
                    max="10"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>{t("emotion")}</Label>
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
                  <X className="h-4 w-4 mr-1" />
                  {t("clear")}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("comment")}
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={t("commentPlaceholder")}
            />
          </div>

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
