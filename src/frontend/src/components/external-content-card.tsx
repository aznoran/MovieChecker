"use client";

import React from "react";
import Image from "next/image";
import type { ExternalContentResult } from "@/lib/api.generated";
import { ContentType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Film, Tv, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExternalContentCardProps {
  content: ExternalContentResult;
  onSelect: (content: ExternalContentResult) => void;
  selected?: boolean;
}

const contentTypeIcons: Record<number, typeof Film> = {
  0: Film,     // Movie
  1: Tv,       // Series
  2: Sparkles, // Anime
  3: Film,     // Cartoon
  4: Tv,       // Show
};

export function ExternalContentCard({ content, onSelect, selected }: ExternalContentCardProps) {
  const Icon = content.type !== undefined ? (contentTypeIcons[Number(content.type)] || Film) : Film;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden",
        selected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(content)}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Poster */}
          <div className="relative flex-shrink-0 w-24 h-36 bg-muted rounded-md overflow-hidden">
            {content.posterUrl ? (
              <Image
                src={content.posterUrl}
                alt={content.title ?? "Content"}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                {content.title}
              </h3>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                {content.year && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{content.year}</span>
                  </div>
                )}
                
                {content.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{content.rating.toFixed(1)}</span>
                  </div>
                )}

                {content.episodes && (
                  <Badge variant="secondary" className="text-xs">
                    {content.episodes} eps
                  </Badge>
                )}

                {content.seasons && (
                  <Badge variant="secondary" className="text-xs">
                    {content.seasons} seasons
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {content.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-tight">
                {content.description.replace(/<[^>]*>/g, '')} {/* Strip HTML tags */}
              </p>
            )}

            {/* Genres */}
            {content.genres && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {content.genres}
              </p>
            )}

            {/* Source Badge */}
            <Badge variant="outline" className="text-xs">
              {content.source?.toUpperCase() ?? "UNKNOWN"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
