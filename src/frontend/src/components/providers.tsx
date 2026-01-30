"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/context/auth-context";
import { LocaleProvider } from "@/context/locale-context";
import { GroupProvider } from "@/context/group-context";
import { ConfirmDialogProvider } from "@/components/confirm-dialog";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <GroupProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </GroupProvider>
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
