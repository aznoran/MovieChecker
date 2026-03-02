"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { provisionUser } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

const PROVISION_KEY = "user_provisioned";

export function ProvisionGuard({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== "authenticated") return;

        if (localStorage.getItem(PROVISION_KEY)) {
            setReady(true);
            return;
        }

        let cancelled = false;

        provisionUser()
            .then(() => {
                if (cancelled) return;
                localStorage.setItem(PROVISION_KEY, "1");
                setReady(true);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.message || "Failed to provision user");
            });

        return () => {
            cancelled = true;
        };
    }, [status]);

    // Pass through when not authenticated (login pages, etc.)
    if (status !== "authenticated") {
        return <>{children}</>;
    }

    if (error) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive">{error}</p>
                <Button
                    onClick={() => {
                        setError(null);
                        provisionUser()
                            .then(() => {
                                localStorage.setItem(PROVISION_KEY, "1");
                                setReady(true);
                            })
                            .catch((err) => {
                                setError(err?.message || "Failed to provision user");
                            });
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (!ready) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return <>{children}</>;
}
