"use client";

import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {useStats} from "@/hooks/api";
import {GroupType, EntryContentType} from "@/lib/api/generated";
import {getContentTypeLabels, translateGenre} from "@/lib/i18n/labels";
import type {TranslationKeys} from "@/lib/i18n";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    CheckCircle2,
    PlayCircle,
    Clock,
    XCircle,
    HelpCircle,
    Star,
    Heart,
    Users,
    Film,
    Popcorn,
    RefreshCw,
    AlertCircle,
    TrendingUp,
    BarChart3,
    Tag,
} from "lucide-react";
import {toast} from "sonner";
import {useEffect} from "react";
import {StarRating} from "./_components/star-rating";
import {StatsPageSkeleton} from "./_components/stats-skeleton";
import {StatusPieChart} from "./_components/status-pie-chart";
import {ContentTypeBarChart} from "./_components/content-type-bar-chart";
import {ActivityTimelineChart} from "./_components/activity-timeline-chart";
import {RatingDistributionChart} from "./_components/rating-distribution-chart";
import {GenreBarChart} from "./_components/genre-bar-chart";
import {MemberActivityChart} from "./_components/member-activity-chart";
import {ProgressBar} from "./_components/progress-bar";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, {
    icon: typeof CheckCircle2;
    gradient: string;
    text: string;
    chart: string;
    bar: string;
}> = {
    completed: {
        icon: CheckCircle2,
        gradient: "from-green-500/15 to-green-500/5",
        text: "text-green-500",
        chart: "hsl(142, 71%, 45%)",
        bar: "bg-green-500",
    },
    watching: {
        icon: PlayCircle,
        gradient: "from-yellow-500/15 to-yellow-500/5",
        text: "text-yellow-500",
        chart: "hsl(48, 96%, 53%)",
        bar: "bg-yellow-500",
    },
    planned: {
        icon: Clock,
        gradient: "from-blue-500/15 to-blue-500/5",
        text: "text-blue-500",
        chart: "hsl(217, 91%, 60%)",
        bar: "bg-blue-500",
    },
    dropped: {
        icon: XCircle,
        gradient: "from-red-500/15 to-red-500/5",
        text: "text-red-500",
        chart: "hsl(0, 84%, 60%)",
        bar: "bg-red-500",
    },
    considering: {
        icon: HelpCircle,
        gradient: "from-gray-500/15 to-gray-500/5",
        text: "text-gray-400",
        chart: "hsl(0, 0%, 60%)",
        bar: "bg-gray-400",
    },
};

export default function StatsPage() {
    const {data: session, status: authStatus} = useSession();
    const {locale, t} = useLocale();
    const {activeGroupId, activeGroup, isLoading: isGroupsLoading} = useGroup();
    const router = useRouter();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const {data: stats, isLoading, error, refetch} = useStats(activeGroupId, {
        enabled: !!session && activeGroupId !== undefined,
        retry: false,
    });

    useEffect(() => {
        if (error) {
            toast.error(t("errorLoadingStats"), {position: "top-center"});
        }
    }, [error, t]);

    if (authStatus === "loading") {
        return <StatsPageSkeleton/>;
    }

    if (!session) {
        router.push("/login");
        return null;
    }

    const total = stats
        ? (stats.totalWatched ?? 0) + (stats.totalWatching ?? 0) + (stats.totalPlanned ?? 0) + (stats.totalDropped ?? 0) + (stats.totalConsidering ?? 0)
        : 0;

    const statusItems = stats
        ? [
            {key: "completed", label: t("completed"), value: stats.totalWatched ?? 0},
            {key: "watching", label: t("watching"), value: stats.totalWatching ?? 0},
            {key: "planned", label: t("planned"), value: stats.totalPlanned ?? 0},
            {key: "dropped", label: t("dropped"), value: stats.totalDropped ?? 0},
            {key: "considering", label: t("considering"), value: stats.totalConsidering ?? 0},
        ]
        : [];

    const pieData = statusItems.map((s) => ({
        name: s.label,
        value: s.value,
        color: STATUS_META[s.key].chart,
    }));

    if (isLoading || isGroupsLoading) {
        return <StatsPageSkeleton/>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4"/>
                <p className="text-muted-foreground mb-4">{t("errorLoadingStats")}</p>
                <Button onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-1.5"/>
                    {t("retryLoad")}
                </Button>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <Popcorn className="h-12 w-12 mx-auto text-muted-foreground mb-4"/>
                <p className="text-muted-foreground">{t("noStats")}</p>
            </div>
        );
    }

    // Content type data
    const contentTypeLabels = getContentTypeLabels(locale);
    const typeEntries = Object.entries(stats.byType ?? {});
    const barData = typeEntries.map(([typeName, count]) => ({
        name: contentTypeLabels[typeName as EntryContentType] || typeName,
        count,
    }));

    // Activity timeline data
    const timelineData = (stats.activityTimeline ?? []).map((p) => ({
        date: p.date ?? "",
        count: p.count ?? 0,
    }));

    // Rating distribution data (backend stores internal ratings 1-20, display as 0.5-10)
    const ratingDistData = Object.entries(stats.ratingDistribution ?? {})
        .map(([key, count]) => ({
            rating: (Number(key) / 2).toString(),
            count: count as number,
            sortKey: Number(key),
        }))
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({rating, count}) => ({rating, count}));

    // Genre distribution data
    const genreData = Object.entries(stats.genreDistribution ?? {})
        .map(([genre, count]) => ({
            name: translateGenre(genre, locale),
            count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Member activity data
    const memberActivityData = (stats.memberActivity ?? [])
        .map((m: { displayName?: string | null; totalEntries?: number }) => ({
            name: m.displayName ?? "",
            count: m.totalEntries ?? 0,
        }))
        .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            {isGroupMode && activeGroup && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4"/>
                    <span>{activeGroup.name}</span>
                    <span>&middot;</span>
                    <span>{activeGroup.members?.length ?? 0} {t("memberCount")}</span>
                </div>
            )}

            {/* ── Row 1: Status Cards ── */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
                {statusItems.map((item) => {
                    const meta = STATUS_META[item.key];
                    const Icon = meta.icon;
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                        <Card key={item.key} className={`bg-gradient-to-br ${meta.gradient} border-0`}>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">{item.label}</span>
                                    <Icon className={`h-5 w-5 ${meta.text}`}/>
                                </div>
                                <div className="text-3xl font-bold tabular-nums mb-2">{item.value}</div>
                                <div className="flex items-center gap-2">
                                    <ProgressBar value={item.value} max={total} color={meta.bar}/>
                                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Row 2: Donut Chart + Rating ── */}
            <div className="grid gap-3 lg:grid-cols-2">
                {/* Donut Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{t("statusBreakdown")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            <div className="w-full sm:w-1/2">
                                <StatusPieChart data={pieData} total={total}/>
                            </div>
                            <div className="w-full sm:w-1/2 space-y-2.5">
                                {statusItems.map((item) => {
                                    const meta = STATUS_META[item.key];
                                    const Icon = meta.icon;
                                    return (
                                        <div key={item.key} className="flex items-center gap-2.5">
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0"
                                                 style={{backgroundColor: meta.chart}}/>
                                            <Icon className={`h-3.5 w-3.5 ${meta.text} shrink-0`}/>
                                            <span
                                                className="text-sm text-muted-foreground flex-1">{item.label}</span>
                                            <span className="font-semibold tabular-nums">{item.value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rating Card */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-400"/>
                            {isGroupMode ? t("ratings") ?? t("averageRating") : t("averageRating")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                        {isGroupMode ? (
                            <div className="w-full">
                                <GroupRatings
                                    stats={stats}
                                    activeGroup={activeGroup}
                                    t={t}
                                />
                            </div>
                        ) : (
                            <PersonalRating rating={stats.averageMyRating ?? 0} t={t}/>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Row 3: Content Type Bar Chart ── */}
            {barData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Film className="h-4 w-4"/>
                            {t("byContentType")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ContentTypeBarChart data={barData}/>
                    </CardContent>
                </Card>
            )}

            {/* ── Row 4: Activity Timeline ── */}
            {timelineData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4"/>
                            {t("activityTimeline")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ActivityTimelineChart data={timelineData}/>
                    </CardContent>
                </Card>
            )}

            {/* ── Row 5: Rating Distribution + Top Genres ── */}
            {(ratingDistData.length > 0 || genreData.length > 0) && (
                <div className="grid gap-3 lg:grid-cols-2">
                    {ratingDistData.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4"/>
                                    {t("ratingDistribution")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RatingDistributionChart data={ratingDistData}/>
                            </CardContent>
                        </Card>
                    )}
                    {genreData.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Tag className="h-4 w-4"/>
                                    {t("topGenres")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <GenreBarChart data={genreData}/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Row 6: Member Activity (group mode only) ── */}
            {isGroupMode && memberActivityData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4"/>
                            {t("memberComparison")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MemberActivityChart data={memberActivityData}/>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/* ── Sub-components to keep the main render clean ── */

function PersonalRating({rating, t}: { rating: number; t: (k: TranslationKeys) => string }) {
    if (rating <= 0) {
        return <p className="text-muted-foreground text-sm py-4">{t("noRated")}</p>;
    }
    return (
        <div className="flex flex-col items-center justify-center py-4 gap-3">
            <div className="text-5xl font-bold tabular-nums">
                {(rating / 2).toFixed(1)}
                <span className="text-xl text-muted-foreground">/10</span>
            </div>
            <StarRating rating={rating}/>
        </div>
    );
}

function GroupRatings({stats, activeGroup, t}: {
    stats: { averageMyRating?: number; averagePartnerRating?: number; memberRatings?: { userId?: string; displayName?: string | null; averageRating?: number; totalRated?: number }[] | null };
    activeGroup: { members?: unknown[] | null } | undefined;
    t: (k: TranslationKeys) => string;
}) {
    const memberCount = activeGroup?.members?.length ?? 0;

    // Single member
    if (memberCount <= 1) {
        return <PersonalRating rating={stats.averageMyRating ?? 0} t={t}/>;
    }

    // 2 members: my vs friend
    if (memberCount === 2) {
        return (
            <div className="space-y-4 py-2">
                <RatingRow
                    icon={<Star className="h-4 w-4 text-yellow-400"/>}
                    label={t("myAvgRating")}
                    rating={stats.averageMyRating ?? 0}
                    t={t}
                />
                <div className="border-t"/>
                <RatingRow
                    icon={<Heart className="h-4 w-4 text-pink-400"/>}
                    label={t("friendAvgRating")}
                    rating={stats.averagePartnerRating ?? 0}
                    t={t}
                />
            </div>
        );
    }

    // 3+ members: leaderboard
    if (!stats.memberRatings?.length) {
        return <p className="text-muted-foreground text-sm py-4">{t("noRated")}</p>;
    }

    const sorted = [...stats.memberRatings].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    const podiumColors = ["text-yellow-400", "text-zinc-400", "text-amber-600"];

    return (
        <div className="space-y-3 py-1">
            {sorted.map((mr, idx) => {
                const accent = idx < 3 ? podiumColors[idx] : "text-muted-foreground";
                const ratingVal = (mr.averageRating ?? 0) / 2;
                return (
                    <div key={mr.userId} className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-5 text-center ${accent}`}>{idx + 1}</span>
                        <span className="text-sm flex-1 truncate">{mr.displayName}</span>
                        <span className="text-xs text-muted-foreground">{mr.totalRated} {t("rated")}</span>
                        {ratingVal > 0 ? (
                            <span className="font-bold tabular-nums text-sm">
                                {ratingVal.toFixed(1)}<span className="text-muted-foreground text-xs">/10</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground text-xs">{t("noRated")}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function RatingRow({icon, label, rating, t}: {
    icon: React.ReactNode;
    label: string;
    rating: number;
    t: (k: TranslationKeys) => string;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            {rating > 0 ? (
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold tabular-nums">
                        {(rating / 2).toFixed(1)}
                        <span className="text-sm text-muted-foreground">/10</span>
                    </span>
                    <StarRating rating={rating}/>
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">{t("noRated")}</p>
            )}
        </div>
    );
}
