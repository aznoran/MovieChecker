"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { getStats } from "@/lib/api";
import { EmotionEmojis } from "@/types";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  TrendingUp,
  Hash,
} from "lucide-react";

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
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => {
        let fill: string;
        if (i < full) {
          fill = "text-yellow-400";
        } else if (i === full && partial >= 0.5) {
          fill = "text-yellow-400/50";
        } else {
          fill = "text-muted-foreground/20";
        }
        return <Star key={i} className={`h-3.5 w-3.5 fill-current ${fill}`} />;
      })}
    </div>
  );
}

export default function StatsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const { activeGroupId, activeGroup } = useGroup();
  const router = useRouter();
  const isGroupMode = !!activeGroupId && !!activeGroup;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats", activeGroupId],
    queryFn: () => getStats(activeGroupId),
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-4xl">

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !stats ? (
          <div className="text-center py-12">
            <Popcorn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                      <BarChart3 className="h-7 w-7" />
                      {t("statistics")}
                    </h1>
                    {isGroupMode && activeGroup && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
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
                  <Hash className="h-4 w-4" />
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
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Icon className={`h-4 w-4 ${item.textColor}`} />
                            {item.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="text-2xl font-bold">{item.value}</div>
                        <ProgressBar value={item.value} max={total} color={item.color} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ── Ratings Section ── */}
            {isGroupMode ? (
              activeGroup && activeGroup.members.length <= 2 ? (
                /* Group with 2 members: classic My vs Partner layout */
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("myAvgRating")}
                        </span>
                      </div>
                      {stats.averageMyRating > 0 ? (
                        <>
                          <div className="text-3xl font-bold mb-2">
                            {stats.averageMyRating.toFixed(1)}
                            <span className="text-lg text-muted-foreground">/10</span>
                          </div>
                          <StarRating rating={stats.averageMyRating} />
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-5 w-5 text-pink-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("partnerAvgRating")}
                        </span>
                      </div>
                      {stats.averagePartnerRating > 0 ? (
                        <>
                          <div className="text-3xl font-bold mb-2">
                            {stats.averagePartnerRating.toFixed(1)}
                            <span className="text-lg text-muted-foreground">/10</span>
                          </div>
                          <StarRating rating={stats.averagePartnerRating} />
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-purple-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("watchedTogether")}
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-purple-400">
                        {stats.watchedTogether}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Group with 3+ members: per-member ratings + watched together */
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
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
                                <div key={mr.userId} className="flex items-center gap-4">
                                  <div className={`text-lg font-bold w-6 text-center ${accentColor}`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-sm truncate">
                                        {mr.displayName}
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs text-muted-foreground">
                                          {mr.totalRated} {t("rated")}
                                        </span>
                                        {mr.averageRating > 0 ? (
                                          <span className="font-bold">
                                            {mr.averageRating.toFixed(1)}
                                            <span className="text-muted-foreground text-xs">/10</span>
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">{t("noRated")}</span>
                                        )}
                                      </div>
                                    </div>
                                    {mr.averageRating > 0 && (
                                      <StarRating rating={mr.averageRating} />
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
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-purple-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("watchedTogether")}
                        </span>
                      </div>
                      <div className="text-3xl font-bold text-purple-400">
                        {stats.watchedTogether}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            ) : (
              /* Personal mode: single rating card, prominent */
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("averageRating")}
                        </span>
                      </div>
                      {stats.averageMyRating > 0 ? (
                        <>
                          <div className="text-4xl font-bold mb-2">
                            {stats.averageMyRating.toFixed(1)}
                            <span className="text-xl text-muted-foreground">/10</span>
                          </div>
                          <StarRating rating={stats.averageMyRating} />
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t("noRated")}</p>
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <TrendingUp className="h-16 w-16 text-muted-foreground/10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── By Content Type ── */}
            {Object.keys(stats.byType).length > 0 && (() => {
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
                      <Film className="h-4 w-4" />
                      {t("byContentType")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {typeEntries.map(([typeName, count], i) => (
                        <div key={typeName} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{typeName}</span>
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
              // Map emotion names to emojis
              const emotionNameToEmoji: Record<string, string> = {};
              Object.entries(EmotionEmojis).forEach(([key, emoji]) => {
                // The backend returns emotion names like "Joy", "Sadness", etc.
                // EmotionEmojis is keyed by enum number
                const names = ["Joy", "Sadness", "Excitement", "Cringe", "Confused", "Neutral"];
                const namesRu = ["Радость", "Грусть", "Восторг", "Кринж", "Что это было?", "Нейтрально"];
                const idx = Number(key);
                if (names[idx]) emotionNameToEmoji[names[idx]] = emoji;
                if (namesRu[idx]) emotionNameToEmoji[namesRu[idx]] = emoji;
              });
              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Smile className="h-4 w-4" />
                      {t("emotionsAfterWatching")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {emotionEntries.map(([emotionName, count]) => {
                        const emoji = emotionNameToEmoji[emotionName] || "";
                        const pct = maxEmotionCount > 0 ? Math.round((count / maxEmotionCount) * 100) : 0;
                        return (
                          <div
                            key={emotionName}
                            className="flex items-center gap-3 rounded-lg border p-3"
                          >
                            <span className="text-2xl">{emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="truncate">{emotionName}</span>
                                <span className="font-semibold ml-2">{count}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
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
