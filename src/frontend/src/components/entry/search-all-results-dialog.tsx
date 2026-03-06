"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/context/locale-context";
import { SearchResultCard } from "./search-result-card";
import type { SearchResultDto } from "@/lib/api/generated";
import { Search, Languages } from "lucide-react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    results: SearchResultDto[];
    onSelect: (result: SearchResultDto) => void;
    onTranslate?: () => void;
    onForceTranslate?: (externalId: number, provider: string) => void;
    isTranslating?: boolean;
    translatePhase?: "idle" | "exit" | "enter";
}

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

export function SearchAllResultsDialog({ open, onOpenChange, results, onSelect, onTranslate, onForceTranslate, isTranslating, translatePhase = "idle" }: Props) {
    const { t, locale } = useLocale();

    const handleSelect = (result: SearchResultDto) => {
        onSelect(result);
        onOpenChange(false);
    };

    const sorted = [...results].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const groups = groupByTitle(sorted);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        {t("searchAllResults")}
                        {onTranslate && results.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 ml-1"
                                onClick={onTranslate}
                                disabled={isTranslating}
                                title={t("translateResults")}
                            >
                                <Languages className="h-4 w-4" />
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(90vh - 8rem)" }} data-locale-phase={translatePhase}>
                    <div className="flex flex-col gap-3 pr-2">
                        {groups.map((group, gi) =>
                            group.results.length === 1 ? (
                                <div key={`${group.results[0].provider}-${group.results[0].externalId}`} data-locale-animate style={{ "--card-index": gi } as React.CSSProperties}>
                                    <SearchResultCard
                                        result={group.results[0]}
                                        onSelect={handleSelect}
                                        onForceTranslate={onForceTranslate}
                                        compact={false}
                                        translating={isTranslating}
                                    />
                                </div>
                            ) : (
                                <div key={group.title} className="border border-yellow-500/40 rounded-lg p-2 bg-yellow-500/10 dark:bg-yellow-500/5 space-y-2" data-locale-animate style={{ "--card-index": gi } as React.CSSProperties}>
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-sm font-medium">{group.title}</p>
                                        <span className="text-[10px] text-yellow-700 dark:text-yellow-400 whitespace-nowrap">{group.results.length} {t("sources")}</span>
                                    </div>
                                    {group.results.map((result) => (
                                        <SearchResultCard
                                            key={`${result.provider}-${result.externalId}`}
                                            result={result}
                                            onSelect={handleSelect}
                                            onForceTranslate={onForceTranslate}
                                            compact={false}
                                            hideTitle
                                            translating={isTranslating}
                                        />
                                    ))}
                                </div>
                            )
                        )}
                        {locale !== "en" && groups.length <= 2 && (
                            <p className="text-xs text-muted-foreground text-center py-2">
                                {t("searchTryEnglish")}
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
