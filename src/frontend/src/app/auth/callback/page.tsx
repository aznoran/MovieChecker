"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Loader2, AlertCircle} from "lucide-react";
import {useAuth} from "@/context/auth-context";

const AUTHENTIK_REDIRECT_URI =
    process.env.NEXT_PUBLIC_AUTHENTIK_REDIRECT_URI || "http://localhost:3000/auth/callback";

const INVITE_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function CallbackHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const {handleOidcCallback, isAuthenticated} = useAuth();
    const [error, setError] = useState<string | null>(null);
    const hasProcessed = useRef(false);

    useEffect(() => {
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const processCallback = async () => {
            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const errorParam = searchParams.get("error");

            if (errorParam) {
                const errorDesc = searchParams.get("error_description") || errorParam;
                setError(errorDesc);
                return;
            }

            if (!code) {
                setError("No authorization code received");
                return;
            }

            // Verify state
            const savedState = sessionStorage.getItem("oidc_state");
            if (state !== savedState) {
                setError("Invalid state parameter");
                return;
            }

            // Get code verifier for PKCE
            const codeVerifier = sessionStorage.getItem("oidc_code_verifier");

            // Clean up session storage
            sessionStorage.removeItem("oidc_state");
            sessionStorage.removeItem("oidc_code_verifier");

            try {
                await handleOidcCallback(code, AUTHENTIK_REDIRECT_URI, codeVerifier || undefined);

                // Check for pending invite token
                let redirectTo = "/";
                const raw = localStorage.getItem("pendingInviteToken");
                if (raw) {
                    localStorage.removeItem("pendingInviteToken");
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.token && Date.now() - parsed.ts < INVITE_TOKEN_EXPIRY_MS) {
                            redirectTo = `/join/${parsed.token}`;
                        }
                    } catch {
                        /* ignore malformed */
                    }
                }

                router.push(redirectTo);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Authentication failed");
            }
        };

        processCallback();
    }, [searchParams, handleOidcCallback, router]);

    if (isAuthenticated) {
        return null;
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                        <AlertCircle className="h-8 w-8 text-destructive"/>
                        <p className="text-sm text-destructive text-center">{error}</p>
                        <a href="/login" className="text-primary underline-offset-4 hover:underline text-sm">
                            Try again
                        </a>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
            <Card className="w-full max-w-sm">
                <CardContent className="flex items-center justify-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    <span className="ml-2 text-muted-foreground">Completing login...</span>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                    <Card className="w-full max-w-sm">
                        <CardContent className="flex items-center justify-center p-6">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        </CardContent>
                    </Card>
                </div>
            }
        >
            <CallbackHandler/>
        </Suspense>
    );
}
