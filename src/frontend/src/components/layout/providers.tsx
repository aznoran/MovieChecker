"use client";

import {QueryClientProvider} from "@tanstack/react-query";
import {type ReactNode} from "react";
import {ThemeProvider} from "next-themes";
import {LocaleProvider} from "@/context/locale-context";
import {GroupProvider} from "@/context/group-context";
import {PermissionsProvider} from "@/context/permissions-context";
import {SessionProvider} from "next-auth/react";
import {ProvisionGuard} from "@/components/auth/provision-guard";
import {queryClient} from "@/lib/api";

export function Providers({children}: { children: ReactNode }) {
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
                        <ProvisionGuard>
                            <GroupProvider>
                                <PermissionsProvider>{children}</PermissionsProvider>
                            </GroupProvider>
                        </ProvisionGuard>
                    </LocaleProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </SessionProvider>
    );
}
