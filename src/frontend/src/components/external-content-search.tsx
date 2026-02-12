"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalContentCard } from "./external-content-card";
import { useTmdbSearch, useAniListSearch } from "@/hooks/use-external-content";
import type { ExternalContentResult } from "@/lib/api.generated";
import { ContentType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExternalContentSearchProps {
  onSelect: (content: ExternalContentResult) => void;
  contentType?: ContentType;
}

export function ExternalContentSearch({ onSelect, contentType }: ExternalContentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<"tmdb" | "anilist">(
    contentType === ContentType.Anime ? "anilist" : "tmdb"
  );

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const shouldEnableTmdb = selectedSource === "tmdb" && debouncedQuery.length >= 2;
  const shouldEnableAnilist = selectedSource === "anilist" && debouncedQuery.length >= 2;

  const tmdbQuery = useTmdbSearch(debouncedQuery, shouldEnableTmdb);
  const anilistQuery = useAniListSearch(debouncedQuery, shouldEnableAnilist);

  const activeQuery = selectedSource === "tmdb" ? tmdbQuery : anilistQuery;
  const results = (activeQuery.data?.results ?? []).filter((r): r is ExternalContentResult => r !== null);
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  const handleSelect = useCallback((content: ExternalContentResult) => {
    onSelect(content);
  }, [onSelect]);

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 border rounded-lg">
          <Skeleton className="w-24 h-36 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="external-search">
          Search External Databases
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="external-search"
            placeholder="Search for movies, series, or anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs
        value={selectedSource}
        onValueChange={(value) => setSelectedSource(value as "tmdb" | "anilist")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tmdb">TMDB (Movies/TV)</TabsTrigger>
          <TabsTrigger value="anilist">AniList (Anime)</TabsTrigger>
        </TabsList>

        <TabsContent value="tmdb" className="mt-4">
          {renderContent("tmdb")}
        </TabsContent>

        <TabsContent value="anilist" className="mt-4">
          {renderContent("anilist")}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderContent(source: "tmdb" | "anilist") {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Enter at least 2 characters to search</p>
        </div>
      );
    }

    if (isLoading) {
      return renderLoadingSkeleton();
    }

    if (isError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to search {source.toUpperCase()}. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }

    if (results.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No results found for "{debouncedQuery}"</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {results.map((content) => (
            <ExternalContentCard
              key={`${content.source}-${content.externalId}`}
              content={content}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </ScrollArea>
    );
  }
}
