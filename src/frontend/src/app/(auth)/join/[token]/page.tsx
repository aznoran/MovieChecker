"use client"

import {useEffect, useState, useRef} from "react";
import {useParams, useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {joinGroup as apiJoinGroup} from "@/lib/api";
import type {GroupDto} from "@/lib/api/generated";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    Loader2,
    CircleCheck,
    XCircle,
    Users,
    LogIn,
    Clapperboard,
} from "lucide-react";
import {useQueryClient} from "@tanstack/react-query";

export default function JoinByTokenPage() {
    const params = useParams();
    const router = useRouter();
    const {t} = useLocale();
    const { data: session, status: authStatus } = useSession();
    const {setActiveGroupId} = useGroup();
    const queryClient = useQueryClient();
    const token = params.token as string;

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [joinedGroup, setJoinedGroup] = useState<GroupDto | null>(null);
    const [showContent, setShowContent] = useState(false);
    const hasAttempted = useRef(false);

    useEffect(() => {
        // Don't attempt join if not authenticated
        if (!session) return;
        if (!token || hasAttempted.current) return;
        hasAttempted.current = true;

        const doJoin = async () => {
            try {
                const group = await apiJoinGroup("", undefined, token);
                await queryClient.invalidateQueries({queryKey: ["groups"]});
                setJoinedGroup(group);
                setStatus("success");

                // Trigger animation after render
                requestAnimationFrame(() => setShowContent(true));

                // Set the joined group as active and redirect
                setTimeout(() => {
                    if (group.id) {
                        setActiveGroupId(group.id);
                    }
                    router.push("/");
                }, 2500);
            } catch (err: unknown) {
                const message = err instanceof Error && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
                setErrorMessage(message || t("joinError"));
                setStatus("error");
            }
        };

        doJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, session]);

    // Still determining auth state — show nothing to avoid flash
    if (authStatus === "loading") return null;

    // Not logged in — show login prompt
    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <Clapperboard className="h-10 w-10"/>
                        </div>
                        <CardTitle className="text-2xl">{t("appName")}</CardTitle>
                        <CardDescription>{t("loginRequiredToJoin")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-8 w-8 text-primary"/>
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => {
                                router.push(`/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`);
                            }}
                        >
                            <LogIn className="h-4 w-4 mr-1.5"/>
                            {t("goToLogin")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
            <Card className="w-full max-w-sm">
                <CardContent className="pt-4 pb-8">
                    {/* Loading state */}
                    {status === "loading" && (
                        <div className="text-center space-y-4">
                            <div className="relative mx-auto w-16 h-16">
                                <div className="absolute inset-0 rounded-full border-2 border-primary/20"/>
                                <Loader2 className="h-16 w-16 animate-spin text-primary"/>
                            </div>
                            <p className="text-sm text-muted-foreground">{t("joiningGroup")}</p>
                        </div>
                    )}

                    {/* Success state */}
                    {status === "success" && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center items-center">
                                <CircleCheck color="green" className="h-16 w-16"/>
                            </div>

                            <div
                                className={`space-y-2 transition-all duration-500 delay-200 ease-out ${
                                    showContent
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-4"
                                }`}
                            >
                                <p className="text-lg font-semibold text-foreground">
                                    {t("joinedGroupSuccess")}
                                </p>
                                {joinedGroup?.name && (
                                    <div className="inline-flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border/50">
                                        <Users className="h-4 w-4 text-primary"/>
                                        <span className="text-sm font-medium">{joinedGroup.name}</span>
                                    </div>
                                )}
                            </div>

                            <div
                                className={`transition-all duration-500 delay-500 ease-out ${
                                    showContent
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-2"
                                }`}
                            >
                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin"/>
                                    {t("redirecting")}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {status === "error" && (
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <XCircle className="h-8 w-8 text-destructive"/>
                            </div>
                            <p className="text-sm text-destructive font-medium">{errorMessage}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push("/")}
                            >
                                {t("back")}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
