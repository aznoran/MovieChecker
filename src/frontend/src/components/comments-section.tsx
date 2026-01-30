"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getComments, addComment } from "@/lib/api";
import { useLocale } from "@/context/locale-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { EntryComment } from "@/types";

interface CommentsDialogProps {
  entryId: number;
}

export function CommentsSection({ entryId }: CommentsDialogProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery<EntryComment[]>({
    queryKey: ["comments", entryId],
    queryFn: () => getComments(entryId),
  });

  const mutation = useMutation({
    mutationFn: (text: string) => addComment(entryId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entryId] });
      queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
      setNewComment("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      mutation.mutate(newComment.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        <span>{t("comments")}</span>
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t("addCommentPlaceholder")}
          rows={2}
          maxLength={1000}
          disabled={mutation.isPending}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {newComment.length}/1000
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {t("send")}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("noComments")}
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-3 bg-muted/30 rounded-lg space-y-1"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">{comment.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{comment.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
