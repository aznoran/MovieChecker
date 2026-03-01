import type {Metadata} from "next";
import "./globals.css";
import {Providers} from "@/components/layout/providers";
import {Toaster} from "@/components/ui/sonner";

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
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className="antialiased">
                <Providers>
                    {children}
                    <Toaster/>
                </Providers>
            </body>
        </html>
    );
}
