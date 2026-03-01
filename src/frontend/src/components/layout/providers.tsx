"use client";

import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";
import {ThemeProvider} from "next-themes";
import {LocaleProvider} from "@/context/locale-context";
import {GroupProvider} from "@/context/group-context";
import {PermissionsProvider} from "@/context/permissions-context";
import {SessionProvider} from "next-auth/react";

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
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <LocaleProvider>
                        <GroupProvider>
                            <PermissionsProvider>{children}</PermissionsProvider>
                        </GroupProvider>
                    </LocaleProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
