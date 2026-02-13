"use client";

import {useQuery} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {getStats} from "@/lib/api";
import {EmotionEmojis, GroupType} from "@/types";
import {
    getContentTypeLabels,
    getEmotionLabels,
} from "@/lib/i18n/labels";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    BarChart3,
    CheckCircle2,
    PlayCircle,
    Clock,
    XCircle,
    Star,
    Heart,
    Users,
    Film,
    Smile,
    Loader2,
    Popcorn,
    Hash,
    RefreshCw,
    AlertCircle,
} from "lucide-react";
import {toast} from "sonner";
import {useEffect} from "react";
import {Rating} from "@/components/ui/rating";

export const dynamic = "force-dynamic";

function ProgressBar({
                         value,
                         max,
                         color,
                     }: {
    value: number;
    max: number;
    color: string;
}) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{width: `${pct}%`}}
            />
        </div>
    );
}



export default function StatsPage() {
    const {isAuthenticated, isLoading: authLoading} = useAuth();
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup} = useGroup();
    const router = useRouter();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const {data: stats, isLoading, error, refetch} = useQuery({
        queryKey: ["stats", activeGroupId],
        queryFn: () => getStats(activeGroupId),
        enabled: isAuthenticated,
        retry: false,
    });

    // Show toast notification on error
    useEffect(() => {
        if (error) {
            toast.error(t("errorLoadingStats"), {position: "top-center"});
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
        router.push("/login");
        return null;
    }

    const total = stats
        ? stats.totalWatched + stats.totalWatching + stats.totalPlanned + stats.totalDropped
        : 0;

    const statusItems = stats
        ? [
            {
                key: "completed",
                label: t("completed"),
                value: stats.totalWatched,
                icon: CheckCircle2,
                color: "bg-green-500",
                textColor: "text-green-400",
            },
            {
                key: "watching",
                label: t("watching"),
                value: stats.totalWatching,
                icon: PlayCircle,
                color: "bg-yellow-500",
                textColor: "text-yellow-400",
            },
            {
                key: "planned",
                label: t("planned"),
                value: stats.totalPlanned,
                icon: Clock,
                color: "bg-blue-500",
                textColor: "text-blue-400",
            },
            {
                key: "dropped",
                label: t("dropped"),
                value: stats.totalDropped,
                icon: XCircle,
                color: "bg-red-500",
                textColor: "text-red-400",
            },
        ]
        : [];

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-6 max-w-4xl">

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4"/>
                        <p className="text-muted-foreground mb-4">{t("errorLoadingStats")}</p>
                        <Button onClick={() => refetch()}>
                            <RefreshCw className="h-4 w-4 mr-1.5"/>
                            {t("retryLoad")}
                        </Button>
                    </div>
                ) : !stats ? (
                    <div className="text-center py-12">
                        <Popcorn className="h-12 w-12 mx-auto text-muted-foreground mb-4"/>
                        <p className="text-muted-foreground">{t("noStats")}</p>
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* ── Hero Card ── */}
                        <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            {isGroupMode ? t("groupStatsTitle") : t("personalStats")}
                                        </p>
                                        <h1 className="text-3xl font-bold flex items-center gap-2">
                                            <BarChart3 className="h-7 w-7"/>
                                            {t("statistics")}
                                        </h1>
                                        {isGroupMode && activeGroup && (
                                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5"/>
                                                {activeGroup.name} &middot; {activeGroup.members.length} {t("memberCount")}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-bold">{total}</div>
                                        <p className="text-sm text-muted-foreground">{t("totalEntries")}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Status Breakdown ── */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Hash className="h-4 w-4"/>
                                    {t("statusBreakdown")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {statusItems.map((item) => {
                                        const Icon = item.icon;
                                        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                        return (
                                            <div key={item.key} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                      <Icon className={`h-4 w-4 ${item.textColor}`}/>
                                                        {item.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="text-2xl font-bold">{item.value}</div>
                                                <ProgressBar value={item.value} max={total} color={item.color}/>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* ── Ratings Section ── */}
                        {isGroupMode ? (
                            activeGroup && activeGroup.members.length === 1 ? (
                                /* Group with 1 member: only show my average rating */
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2 mb-3">
                                            <Star className="h-5 w-5 text-yellow-400"/>
                                            {t("averageRating")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {stats.averageMyRating > 0 ? (
                                            <>
                                                <div className="text-3xl font-bold mb-2">
                                                    {stats.averageMyRating.toFixed(1)}
                                                    <span className="text-lg text-muted-foreground">/10</span>
                                                </div>
                                                <Rating value={stats.averageMyRating} readOnly size="sm" />
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : activeGroup && activeGroup.members.length === 2 ? (
                                /* Group with 2 members: classic My vs Friend layout */
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2 mb-3">
                                                <Star className="h-5 w-5 text-yellow-400"/>
                                                {t("myAvgRating")}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {stats.averageMyRating > 0 ? (
                                                <>
                                                    <div className="text-3xl font-bold mb-2">
                                                        {stats.averageMyRating.toFixed(1)}
                                                        <span className="text-lg text-muted-foreground">/10</span>
                                                    </div>
                                                    <Rating value={stats.averageMyRating} readOnly size="sm" />
                                                </>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2 mb-3">
                                                <Heart className="h-5 w-5 text-pink-400"/>
                                                {t("friendAvgRating")}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {stats.averagePartnerRating > 0 ? (
                                                <>
                                                    <div className="text-3xl font-bold mb-2">
                                                        {stats.averagePartnerRating.toFixed(1)}
                                                        <span className="text-lg text-muted-foreground">/10</span>
                                                    </div>
                                                    <Rating value={stats.averagePartnerRating} readOnly size="sm" />
                                                </>
                                            ) : (
                                                <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                /* Group with 3+ members: per-member ratings only (no watched together for 3+ members) */
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Users className="h-4 w-4"/>
                                            {t("memberAvgRatings")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {stats.memberRatings && stats.memberRatings.length > 0 ? (
                                            <div className="space-y-4">
                                                {[...stats.memberRatings]
                                                    .sort((a, b) => b.averageRating - a.averageRating)
                                                    .map((mr, idx) => {
                                                        const memberColors = [
                                                            "text-yellow-400",
                                                            "text-zinc-400",
                                                            "text-amber-600",
                                                        ];
                                                        const accentColor = idx < 3 ? memberColors[idx] : "text-muted-foreground";
                                                        return (
                                                            <div key={mr.userId}
                                                                 className="flex items-center gap-4">
                                                                <div
                                                                    className={`text-lg font-bold w-6 text-center ${accentColor}`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div
                                                                        className="flex items-center justify-between mb-1">
                                                                            <span
                                                                                className="font-medium text-sm truncate"
                                                                            >
                                                                                {mr.displayName}
                                                                            </span>
                                                                        <div
                                                                            className="flex items-center gap-2 shrink-0 ml-2">
                                                                            <span
                                                                                className="text-xs text-muted-foreground">
                                                                              {mr.totalRated} {t("rated")}
                                                                            </span>
                                                                            {mr.averageRating > 0 ? (
                                                                                <span className="font-bold">
                                                                                    {mr.averageRating.toFixed(1)}
                                                                                    <span
                                                                                        className="text-muted-foreground text-xs">/10</span>
                                                                                    </span>
                                                                            ) : (
                                                                                <span
                                                                                    className="text-muted-foreground text-sm">{t("noRated")}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {mr.averageRating > 0 && (
                                                                        <Rating value={mr.averageRating} readOnly size="sm" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        ) : (
                            /* Personal mode: single rating card, prominent */
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-400"/>
                                        {t("averageRating")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats.averageMyRating > 0 ? (
                                        <>
                                            <div className="text-4xl font-bold mb-2">
                                                {stats.averageMyRating.toFixed(1)}
                                                <span className="text-xl text-muted-foreground">/10</span>
                                            </div>
                                            <Rating value={stats.averageMyRating} readOnly size="sm" />
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* ── By Content Type ── */}
                        {Object.keys(stats.byType).length > 0 && (() => {
                            const contentTypeLabels = getContentTypeLabels(locale);
                            // Map enum names to ContentType enum values for translation
                            const typeNameMap: Record<string, string> = {
                                "Movie": contentTypeLabels[0],
                                "Series": contentTypeLabels[1],
                                "Anime": contentTypeLabels[2],
                                "Cartoon": contentTypeLabels[3],
                                "Show": contentTypeLabels[4],
                            };
                            const typeEntries = Object.entries(stats.byType);
                            const maxTypeCount = Math.max(...typeEntries.map(([, c]) => c));
                            const typeColors = [
                                "bg-violet-500",
                                "bg-cyan-500",
                                "bg-amber-500",
                                "bg-emerald-500",
                                "bg-rose-500",
                            ];
                            return (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Film className="h-4 w-4"/>
                                            {t("byContentType")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {typeEntries.map(([typeName, count], i) => (
                                                <div key={typeName} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>{typeNameMap[typeName] || typeName}</span>
                                                        <span className="font-semibold">{count}</span>
                                                    </div>
                                                    <ProgressBar
                                                        value={count}
                                                        max={maxTypeCount}
                                                        color={typeColors[i % typeColors.length]}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* ── Emotions ── */}
                        {Object.keys(stats.byEmotion).length > 0 && (() => {
                            const emotionEntries = Object.entries(stats.byEmotion);
                            const maxEmotionCount = Math.max(...emotionEntries.map(([, c]) => c));
                            const emotionLabels = getEmotionLabels(locale);
                            // Map emotion enum names to emojis and translated labels
                            const emotionEnumNames = ["Joy", "Sadness", "Excitement", "Cringe", "Confused", "Neutral"];
                            const emotionNameToEmoji: Record<string, string> = {};
                            const emotionNameToLabel: Record<string, string> = {};
                            emotionEnumNames.forEach((name, idx) => {
                                emotionNameToEmoji[name] = EmotionEmojis[idx as keyof typeof EmotionEmojis] || "";
                                emotionNameToLabel[name] = emotionLabels[idx as keyof typeof emotionLabels] || name;
                            });
                            return (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Smile className="h-4 w-4"/>
                                            {t("emotionsAfterWatching")}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {emotionEntries.map(([emotionName, count]) => {
                                                const emoji = emotionNameToEmoji[emotionName] || "";
                                                const displayName = emotionNameToLabel[emotionName] || emotionName;
                                                const pct = maxEmotionCount > 0 ? Math.round((count / maxEmotionCount) * 100) : 0;
                                                return (
                                                    <div
                                                        key={emotionName}
                                                        className="flex items-center gap-3 rounded-lg border p-3"
                                                    >
                                                        <span className="text-2xl">{emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className="flex items-center justify-between text-sm mb-1">
                                                                <span className="truncate">{displayName}</span>
                                                                <span className="font-semibold ml-2">{count}</span>
                                                            </div>
                                                            <div
                                                                className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                                                    style={{width: `${pct}%`}}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })()}

                    </div>
                )}
            </main>
        </div>
    );
}
