"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const INVITE_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function LoginRedirect() {
    const searchParams = useSearchParams();

    useEffect(() => {
        // Determine where to redirect after successful login
        let callbackUrl = searchParams.get("callbackUrl") ?? "/";

        // Check for a pending invite token stored before the login redirect
        if (typeof window !== "undefined") {
            const raw = localStorage.getItem("pendingInviteToken");
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.token && Date.now() - parsed.ts < INVITE_TOKEN_EXPIRY_MS) {
                        callbackUrl = `/join/${parsed.token}`;
                    }
                } catch { /* ignore malformed */ }
            }
        }

        signIn("authentik", { callbackUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
