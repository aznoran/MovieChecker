import {AppSidebar} from "@/components/layout/app-sidebar";
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar";
import {NavBar} from "@/components/layout/navbar";
import {Footer} from "@/components/layout/footer";

export default function AppLayout({children}: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar/>
            <SidebarInset
                className="bg-transparent md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:mt-0">
                <NavBar/>
                <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden">
                    <div className="flex-1 p-4">{children}</div>
                    <Footer/>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
