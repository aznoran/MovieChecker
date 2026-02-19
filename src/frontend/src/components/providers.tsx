"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";
import {ThemeProvider} from "next-themes";
import {AuthProvider} from "@/context/auth-context";
import {LocaleProvider} from "@/context/locale-context";
import {GroupProvider} from "@/context/group-context";
import {PermissionsProvider} from "@/context/permissions-context";

export function Providers({children}: { children: ReactNode }) {
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
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <LocaleProvider>
                    <AuthProvider>
                        <GroupProvider>
                            <PermissionsProvider>{children}</PermissionsProvider>
                        </GroupProvider>
                    </AuthProvider>
                </LocaleProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
