"use client";

import {useState, useEffect, useRef} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Clapperboard,
    LogIn,
    Loader2,
    AlertCircle,
    Languages,
} from "lucide-react";
import {ThemeToggle} from "@/components/shared/theme-toggle";
import type {Locale} from "@/lib/i18n";

export function LoginForm() {
    const {locale, setLocale, t} = useLocale();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const {login, isAuthenticated, isLoading: authLoading} = useAuth();
    const router = useRouter();
    const hasRedirected = useRef(false);

    // Check for session expired parameter on mount
    useEffect(() => {
        const sessionExpired = searchParams.get('sessionExpired');
        if (sessionExpired === 'true') {
            setError(t("authError"));
        }
    }, [searchParams, t]);

    // Redirect authenticated users, checking for pending invite token
    useEffect(() => {
        if (!isAuthenticated || hasRedirected.current) return;
        hasRedirected.current = true;

        let redirectTo = "/";
        const raw = localStorage.getItem("pendingInviteToken");
        if (raw) {
            localStorage.removeItem("pendingInviteToken");
            try {
                const parsed = JSON.parse(raw);
                if (parsed.token && Date.now() - parsed.ts < 5 * 60 * 1000) {
                    redirectTo = `/join/${parsed.token}`;
                }
            } catch { /* ignore malformed */ }
        }
        router.push(redirectTo);
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const isProcessing = loading || authLoading;

    const handleLogin = async () => {
        setError("");
        setLoading(true);
        try {
            await login();
        } catch {
            setError(t("loginFailed"));
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
            <div className="absolute top-4 right-4 flex items-center gap-1">
                <ThemeToggle/>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLocale}
                    className="gap-1.5 text-muted-foreground"
                >
                    <Languages className="h-4 w-4"/>
                    {locale.toUpperCase()}
                </Button>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <Clapperboard className="h-10 w-10"/>
                    </div>
                    <CardTitle className="text-2xl">{t("appName")}</CardTitle>
                    <CardDescription>
                        {t("signInDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {error && (
                            <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
                                <AlertCircle className="h-4 w-4"/>
                                {error}
                            </p>
                        )}

                        <Button
                            className="w-full"
                            disabled={isProcessing}
                            onClick={handleLogin}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
                                    {t("pleaseWait")}
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4 mr-1.5"/>
                                    {t("signIn")}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
