import type {Metadata} from "next";
import "./globals.css";
import {Providers} from "@/components/layout/providers";
import {AppSidebar} from "@/components/layout/app-sidebar";
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar";
import {NavBar} from "@/components/layout/navbar";
import {Footer} from "@/components/layout/footer";
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
            <body className={`antialiased`}>
                <Providers>
                    <SidebarProvider>
                        <AppSidebar/>
                        <SidebarInset className="bg-transparent md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:mt-0">
                            <NavBar/>
                            <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden">
                                <div className="flex-1 p-4">
                                    {children}
                                </div>
                                <Footer/>
                            </div>
                        </SidebarInset>
                    </SidebarProvider>
                    <Toaster/>
                </Providers>
            </body>
        </html>
    );
}
