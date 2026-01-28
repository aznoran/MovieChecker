"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { getStats } from "@/lib/api";
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
} from "lucide-react";

export default function StatsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const { activeGroupId } = useGroup();
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          {t("statistics")}
        </h1>

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    {t("completed")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">
                    {stats.totalWatched}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <PlayCircle className="h-4 w-4 text-yellow-400" />
                    {t("watching")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400">
                    {stats.totalWatching}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-400" />
                    {t("planned")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">
                    {stats.totalPlanned}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-400" />
                    {t("dropped")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-400">
                    {stats.totalDropped}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {t("myAvgRating")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.averageMyRating > 0
                      ? stats.averageMyRating.toFixed(1)
                      : "\u2014"}
                    <span className="text-lg text-muted-foreground">/10</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Heart className="h-4 w-4 text-pink-400" />
                    {t("partnerAvgRating")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.averagePartnerRating > 0
                      ? stats.averagePartnerRating.toFixed(1)
                      : "\u2014"}
                    <span className="text-lg text-muted-foreground">/10</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-400" />
                    {t("watchedTogether")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400">
                    {stats.watchedTogether}
                  </div>
                </CardContent>
              </Card>
            </div>

            {Object.keys(stats.byType).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="h-5 w-5" />
                    {t("byContentType")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground">
                          {type}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {Object.keys(stats.byEmotion).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="h-5 w-5" />
                    {t("emotionsAfterWatching")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-6">
                    {Object.entries(stats.byEmotion).map(
                      ([emotion, count]) => (
                        <div key={emotion} className="text-center">
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground">
                            {emotion}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
