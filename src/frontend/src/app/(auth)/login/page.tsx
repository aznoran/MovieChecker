"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function LoginRedirect() {
    const searchParams = useSearchParams();

    useEffect(() => {
        // NextAuth validates callbackUrl server-side (same-origin only)
        const callbackUrl = searchParams.get("callbackUrl") ?? "/";

        signIn("authentik", { redirectTo: callbackUrl });
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
