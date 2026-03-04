"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/context/locale-context";
import { translateSuggestedType, translateGenre } from "@/lib/i18n/labels";
import type { SearchResultDto } from "@/lib/api/generated";

interface Props {
    result: SearchResultDto;
    onSelect: (result: SearchResultDto) => void;
    compact?: boolean;
    hideTitle?: boolean;
    translating?: boolean;
}

export function SearchResultCard({ result, onSelect, compact = true, hideTitle = false, translating = false }: Props) {
    const { locale } = useLocale();
    return (
        <div
            className="relative flex gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden"
            onClick={() => onSelect(result)}
        >
            {result.posterUrl ? (
                <img
                    src={result.posterUrl}
                    alt={result.title ?? ""}
                    className={compact ? "w-12 h-[72px] rounded object-cover flex-shrink-0" : "w-20 h-[120px] rounded object-cover flex-shrink-0"}
                />
            ) : (
                <div className={`${compact ? "w-12 h-[72px]" : "w-20 h-[120px]"} rounded bg-muted flex items-center justify-center flex-shrink-0`}>
                    <span className="text-xs text-muted-foreground">N/A</span>
                </div>
            )}
            <div className="flex flex-col flex-1 min-w-0 gap-1">
                {!hideTitle && (
                    <div className="flex items-start justify-between gap-1">
                        <p className={`font-medium leading-tight ${compact ? "text-sm line-clamp-1" : "text-base line-clamp-2"}`}>
                            {result.title}
                        </p>
                        {result.year && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">{result.year}</span>
                        )}
                    </div>
                )}
                {hideTitle && result.year && (
                    <span className="text-xs text-muted-foreground">{result.year}</span>
                )}
                <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {translateSuggestedType(result.suggestedType ?? "", locale)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {result.provider}
                    </Badge>
                </div>
                {result.genre && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{translateGenre(result.genre, locale)}</p>
                )}
                {result.description && (
                    <p className={`text-xs text-muted-foreground ${compact ? "line-clamp-2" : "line-clamp-3 mt-1"}`}>{result.description}</p>
                )}
                {!compact && (result.totalEpisodes || result.totalSeasons) && (
                    <p className="text-xs text-muted-foreground">
                        {result.totalSeasons && `${result.totalSeasons} seasons `}
                        {result.totalEpisodes && `${result.totalEpisodes} episodes`}
                    </p>
                )}
            </div>
            {translating && <TranslatingSweep />}
        </div>
    );
}

function TranslatingSweep() {
    return (
        <>
            <div
                className="absolute inset-y-0 w-[40%] pointer-events-none z-10"
                style={{
                    background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08), transparent)",
                    animation: "card-translate-sweep 1.8s ease-in-out infinite",
                }}
            />
            <div
                className="absolute inset-y-0 w-px pointer-events-none z-10"
                style={{
                    background: "hsl(var(--primary) / 0.4)",
                    boxShadow: "0 0 6px 1px hsl(var(--primary) / 0.25)",
                    animation: "card-translate-line 1.8s ease-in-out infinite",
                }}
            />
            <style>{`
                @keyframes card-translate-sweep {
                    0% { left: -40%; }
                    100% { left: 100%; }
                }
                @keyframes card-translate-line {
                    0% { left: -1px; }
                    100% { left: 100%; }
                }
            `}</style>
        </>
    );
}

export function SearchResultCardSkeleton({ compact = true }: { compact?: boolean }) {
    return (
        <div className="flex gap-3 p-2 rounded-lg border bg-card">
            <Skeleton className={`${compact ? "w-12 h-[72px]" : "w-20 h-[120px]"} rounded flex-shrink-0`} />
            <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                <div className="flex items-start justify-between gap-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-8 flex-shrink-0" />
                </div>
                <div className="flex gap-1">
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-4 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
                {compact && <Skeleton className="h-3 w-2/3" />}
            </div>
        </div>
    );
}
