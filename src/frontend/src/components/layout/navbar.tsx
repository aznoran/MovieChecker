"use client"

import {useState} from "react"
import {usePathname} from "next/navigation"
import {SidebarTrigger} from "@/components/ui/sidebar"
import {Separator} from "@/components/ui/separator"
import {GroupSwitcher} from "@/components/layout/header/group-switcher"
import {GroupManagementDialog} from "@/components/layout/header/group-management-dialog"
import {LocaleToggle} from "@/components/layout/header/locale-toggle"
import {UserMenu} from "@/components/layout/header/user-menu"
import {ThemeToggle} from "@/components/shared/theme-toggle"
import {useNavLinks} from "@/hooks/use-nav-links"

export function NavBar() {
    const pathname = usePathname()
    const navLinks = useNavLinks()
    const [groupDialogOpen, setGroupDialogOpen] = useState(false)

    // Hide navbar on login/landing pages
    if (pathname === "/login" || pathname === "/landing") {
        return null
    }

    const currentPage = navLinks.find((link) => link.href === pathname) ?? navLinks[0]
    const PageIcon = currentPage.icon

    return (
        <>
            <div className="sticky top-0 z-50 pointer-events-none pb-4 pt-2">
            <header className="flex h-14 shrink-0 items-center gap-4 rounded-xl border bg-card px-4 pointer-events-auto">
                <SidebarTrigger/>
                <Separator orientation="vertical" className="h-4"/>
                <div className="flex items-center justify-center gap-1.5 min-w-[8rem]">
                    <PageIcon className="h-4 w-4 text-muted-foreground shrink-0"/>
                    <span className="text-sm font-medium">{currentPage.label}</span>
                </div>
                <Separator orientation="vertical" className="h-4"/>
                <div className="flex-1 flex items-center gap-2 ml-2">
                    <GroupSwitcher onOpenGroupDialog={() => setGroupDialogOpen(true)}/>
                </div>
                <div className="flex items-center gap-1">
                    <ThemeToggle/>
                    <LocaleToggle/>
                    <UserMenu/>
                </div>
            </header>
            </div>

            <GroupManagementDialog
                open={groupDialogOpen}
                onOpenChange={setGroupDialogOpen}
            />
        </>
    )
}
