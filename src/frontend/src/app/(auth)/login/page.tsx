"use client";

import {useEffect} from "react";
import {useSearchParams} from "next/navigation";
import {Suspense} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Loader2} from "lucide-react";

const AUTHENTIK_URL = process.env.NEXT_PUBLIC_AUTHENTIK_URL || "http://localhost:9000";
const AUTHENTIK_CLIENT_ID = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID || "moviechecker";
const AUTHENTIK_REDIRECT_URI = process.env.NEXT_PUBLIC_AUTHENTIK_REDIRECT_URI || "http://localhost:3000/auth/callback";

function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function LoginRedirect() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const redirect = async () => {
            // Store pending invite token if present
            const inviteToken = searchParams.get("inviteToken");
            if (inviteToken) {
                localStorage.setItem(
                    "pendingInviteToken",
                    JSON.stringify({token: inviteToken, ts: Date.now()})
                );
            }

            // Generate PKCE code verifier and challenge
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            // Store code verifier for the callback
            sessionStorage.setItem("oidc_code_verifier", codeVerifier);

            // Generate state for CSRF protection
            const state = crypto.randomUUID();
            sessionStorage.setItem("oidc_state", state);

            // Build Authentik authorize URL
            const params = new URLSearchParams({
                response_type: "code",
                client_id: AUTHENTIK_CLIENT_ID,
                redirect_uri: AUTHENTIK_REDIRECT_URI,
                scope: "openid profile email",
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: "S256",
            });

            window.location.href = `${AUTHENTIK_URL}/application/o/authorize/?${params.toString()}`;
        };

        redirect();
    }, [searchParams]);

    return null;
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </CardContent>
                </Card>
            </div>
        }>
            <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                        <span className="ml-2 text-muted-foreground">Redirecting to login...</span>
                    </CardContent>
                </Card>
            </div>
            <LoginRedirect/>
        </Suspense>
    );
}
