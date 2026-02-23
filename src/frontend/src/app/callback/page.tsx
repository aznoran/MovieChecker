"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUserManager } from "@/lib/oidc";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function CallbackPage() {
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const handleCallback = async () => {
      try {
        const mgr = getUserManager();
        await mgr.signinRedirectCallback();

        // Check for pending invite token
        let redirectTo = "/";
        const raw = localStorage.getItem("pendingInviteToken");
        if (raw) {
          localStorage.removeItem("pendingInviteToken");
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token && Date.now() - parsed.ts < 5 * 60 * 1000) {
              redirectTo = `/join/${parsed.token}`;
            }
          } catch {
            /* ignore malformed */
          }
        }

        router.push(redirectTo);
      } catch {
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
