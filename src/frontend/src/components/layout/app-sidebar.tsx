"use client"

import {usePathname} from "next/navigation"
import Link from "next/link"
import {useLocale} from "@/context/locale-context"
import {useGroup} from "@/context/group-context"
import {GroupRole, GroupType} from "@/lib/api/generated"
import {useNavLinks} from "@/hooks/use-nav-links"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import {Avatar, AvatarFallback} from "@/components/ui/avatar"
import {Crown, Film, Shield} from "lucide-react"

export function AppSidebar() {
    const pathname = usePathname()
    const {t} = useLocale()
    const navLinks = useNavLinks()
    const {activeGroup} = useGroup()

    // Hide sidebar on login/landing pages
    if (pathname === "/login" || pathname === "/landing") {
        return null
    }

    const isNonPersonalGroup = activeGroup && activeGroup.groupType !== GroupType.Personal
    const members = isNonPersonalGroup ? (activeGroup.members ?? []) : []

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
                <Link href="/" className="flex items-center gap-2 text-lg font-bold group-data-[collapsible=icon]:justify-center">
                    <Film className="h-5 w-5 shrink-0"/>
                    <span className="group-data-[collapsible=icon]:hidden">MovieChecker</span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t("navPages")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navLinks.map((link) => {
                                const Icon = link.icon
                                return (
                                    <SidebarMenuItem key={link.href}>
                                        <SidebarMenuButton asChild isActive={pathname === link.href} tooltip={link.label}>
                                            <Link href={link.href}>
                                                <Icon className="h-4 w-4"/>
                                                <span className="flex-1">{link.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {isNonPersonalGroup && members.length > 0 && (
                    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                        <SidebarGroupLabel>{t("members")}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {members.map((member) => {
                                    const initials = (member.displayName ?? "?")
                                        .split(" ")
                                        .map((w) => w[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()

                                    let roleIcon = <></>;

                                    if (member.role === GroupRole.Owner) {
                                        roleIcon = <Crown className="h-4 w-4 text-yellow-500 shrink-0"/>;
                                    } else if (member.role === GroupRole.Admin) {
                                        roleIcon = <Shield className="h-4 w-4 text-blue-500 shrink-0"/>;
                                    }

                                    return (
                                        <SidebarMenuItem key={member.userId}>
                                            <SidebarMenuButton>
                                                <Avatar className="h-5 w-5 text-[10px]">
                                                    <AvatarFallback>{initials}</AvatarFallback>
                                                </Avatar>
                                                <span>{member.displayName}</span>
                                                <span>{roleIcon}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarRail/>
        </Sidebar>
    )
}
