import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";
import {Providers} from "@/components/providers";
import {Header} from "@/components/header";
import {Footer} from "@/components/footer";
import {Toaster} from "@/components/ui/sonner";
import {Cake} from "lucide-react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        >
        <Providers>
            <header className="bg-red-500">СЕВА С ДНЕМ РОЖДЕНИЯ ПОЗДРАВЛЯЮ <Cake /></header>
            <Header/>
            <div className="flex-1">
                {children}
            </div>
            <Footer/>
            <Toaster/>
        </Providers>
        </body>
        </html>
    );
}
