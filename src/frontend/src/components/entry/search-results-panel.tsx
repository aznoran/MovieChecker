"use client";

import { X, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/context/locale-context";
import { SearchResultCard, SearchResultCardSkeleton } from "./search-result-card";
import type { SearchResultDto } from "@/lib/api/generated";

function groupByTitle(results: SearchResultDto[]) {
    const groups: { title: string; results: SearchResultDto[] }[] = [];
    const map = new Map<string, SearchResultDto[]>();
    for (const r of results) {
        const key = `${(r.englishTitle ?? r.title ?? "").toLowerCase().trim()}::${r.year ?? ""}`;
        if (!map.has(key)) {
            const arr: SearchResultDto[] = [];
            map.set(key, arr);
            groups.push({ title: r.title ?? "", results: arr });
        }
        map.get(key)!.push(r);
    }
    return groups;
}

interface Props {
    results: SearchResultDto[];
    isLoading: boolean;
    onSelect: (result: SearchResultDto) => void;
    onClose: () => void;
    onShowAll?: () => void;
    onTranslate?: () => void;
    onForceTranslate?: (externalId: number, provider: string) => void;
    isTranslating?: boolean;
    translatePhase?: "idle" | "exit" | "enter";
}

export function SearchResultsPanel({
    results,
    isLoading,
    onSelect,
    onClose,
    onShowAll,
    onTranslate,
    onForceTranslate,
    isTranslating,
    translatePhase = "idle",
}: Props) {
    const { t, locale } = useLocale();
    const sorted = [...results].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const groups = groupByTitle(sorted);
    const displayGroups = groups.slice(0, 3);

    return (
        <div className="w-[380px] border rounded-lg bg-background shadow-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{t("searchResults")}</p>
                    {onTranslate && results.length > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={onTranslate}
                            disabled={isTranslating}
                            title={t("translateResults")}
                        >
                            <Languages className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex flex-col gap-2">
                    <SearchResultCardSkeleton />
                    <SearchResultCardSkeleton />
                    <SearchResultCardSkeleton />
                </div>
            ) : displayGroups.length === 0 ? (
                <>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {t("searchNoResults")}
                    </p>
                    {locale !== "en" && (
                        <p className="text-xs text-muted-foreground text-center">
                            {t("searchTryEnglish")}
                        </p>
                    )}
                </>
            ) : (
                <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 6rem)" }} data-locale-phase={translatePhase}>
                    <div className="flex flex-col gap-2">
                        {displayGroups.map((group, gi) =>
                            group.results.length === 1 ? (
                                <div key={`${group.results[0].provider}-${group.results[0].externalId}`} data-locale-animate style={{ "--card-index": gi } as React.CSSProperties}>
                                    <SearchResultCard
                                        result={group.results[0]}
                                        onSelect={onSelect}
                                        onForceTranslate={onForceTranslate}
                                        compact
                                        translating={isTranslating}
                                    />
                                </div>
                            ) : (
                                <div key={group.title} className="border border-yellow-500/40 rounded-lg p-2 bg-yellow-500/10 dark:bg-yellow-500/5 space-y-2" data-locale-animate style={{ "--card-index": gi } as React.CSSProperties}>
                                    <div className="flex items-center gap-2 px-1">
                                        <p className="text-sm font-medium truncate">{group.title}</p>
                                        <span className="text-[10px] text-yellow-700 dark:text-yellow-400 whitespace-nowrap">{group.results.length} {t("sources")}</span>
                                    </div>
                                    {group.results.map((result) => (
                                        <SearchResultCard
                                            key={`${result.provider}-${result.externalId}`}
                                            result={result}
                                            onSelect={onSelect}
                                            onForceTranslate={onForceTranslate}
                                            compact
                                            hideTitle
                                            translating={isTranslating}
                                        />
                                    ))}
                                </div>
                            )
                        )}

                        {groups.length >= 3 && onShowAll && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={onShowAll}
                            >
                                {t("searchShowAll")} ({groups.length})
                            </Button>
                        )}

                        {locale !== "en" && (
                            <p className="text-xs text-muted-foreground text-center">
                                {t("searchTryEnglish")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
