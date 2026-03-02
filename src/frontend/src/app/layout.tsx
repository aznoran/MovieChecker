import type {Metadata} from "next";
import "./globals.css";
import {Providers} from "@/components/layout/providers";
import {Toaster} from "@/components/ui/sonner";
import {ScrollArea} from "@/components/ui/scroll-area";

export const metadata: Metadata = {
    title: "MovieChecker",
    description: "Your movie diary for tracking films, series, and anime",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark h-screen overflow-hidden" suppressHydrationWarning>
            <body className="antialiased h-screen overflow-hidden">
                <Providers>
                    <ScrollArea className="h-screen">
                        {children}
                    </ScrollArea>
                    <Toaster/>
                </Providers>
            </body>
        </html>
    );
}
