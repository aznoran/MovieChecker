"use client";

import {useState} from "react";
import {useSession} from "next-auth/react";
import {Loader2, MessageCircle} from "lucide-react";
import {AppSidebar} from "@/components/layout/app-sidebar";
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar";
import {NavBar} from "@/components/layout/navbar";
import {Footer} from "@/components/layout/footer";
import {Button} from "@/components/ui/button";
import {FeedbackDialog} from "@/components/shared/feedback-dialog";

export default function AppLayout({children}: { children: React.ReactNode }) {
    const {status} = useSession();
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    if (status === "loading") {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground"/>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset
                className="bg-transparent md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:mt-0"
            >
                <NavBar/>
                <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden">
                    <div className="flex-1 p-4">{children}</div>
                    <Footer/>
                </div>
            </SidebarInset>

            <div className="pointer-events-none fixed inset-0 z-40">
                <Button
                    onClick={() => setFeedbackOpen(true)}
                    size="icon"
                    className="pointer-events-auto absolute bottom-6 right-6 rounded-full shadow-lg h-12 w-12"
                >
                    <MessageCircle className="h-5 w-5"/>
                </Button>
            </div>
            <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen}/>
        </SidebarProvider>
    );
}
