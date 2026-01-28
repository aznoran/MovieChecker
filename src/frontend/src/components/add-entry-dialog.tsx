"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMovie, createWatchEntry, uploadPoster } from "@/lib/api";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { useAuth } from "@/context/auth-context";
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
import { GenreMultiSelect } from "@/components/genre-multi-select";
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
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEntryDialog({ open, onOpenChange }: Props) {
  const { locale, t } = useLocale();
  const { activeGroupId, activeGroup } = useGroup();
  const { user } = useAuth();
  const isGroupMode = !!activeGroupId && !!activeGroup;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ContentType>(ContentType.Movie);
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState<WatchStatus>(WatchStatus.Planned);
  const [watchedBy, setWatchedBy] = useState<WatchedBy>(WatchedBy.Together);
  const [myRating, setMyRating] = useState("");
  // Group mode: selected member IDs and per-member ratings
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [memberRatings, setMemberRatings] = useState<Record<number, string>>({});
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [comment, setComment] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contentTypeLabels = getContentTypeLabels(locale);
  const watchStatusLabels = getWatchStatusLabels(locale);
  const watchedByLabels = getWatchedByLabels(locale);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      let posterUrl: string | undefined;
      if (posterFile) {
        posterUrl = await uploadPoster(posterFile);
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
            .map((uid) => ({ userId: uid, rating: parseInt(memberRatings[uid]) }))
        : undefined;

      await createWatchEntry({
        movieId: movie.id,
        status,
        watchedBy: isGroupMode ? WatchedBy.Together : watchedBy,
        rating: !isGroupMode && myRating ? parseInt(myRating) : undefined,
        ratings: ratingsArray,
        emotion: emotion ?? undefined,
        comment: comment || undefined,
        groupId: activeGroupId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
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
    setWatchedBy(WatchedBy.Together);
    setMyRating("");
    setSelectedMembers([]);
    setMemberRatings({});
    setEmotion(null);
    setComment("");
    setPosterFile(null);
    setPosterPreview(null);
    setError("");
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
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            {t("addNewEntry")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Poster Upload */}
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
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={removePoster}
                >
                  <X className="h-4 w-4" />
                </Button>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                {t("title")} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {t("year")}
              </Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1900"
                max="2030"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5" />
              {t("type")}
            </Label>
            <Select
              value={type.toString()}
              onValueChange={(v) => setType(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {t("genre")}
            </Label>
            <GenreMultiSelect value={genre} onChange={setGenre} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t("description")}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
              rows={2}
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
