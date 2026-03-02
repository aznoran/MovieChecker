"use client"

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/context/locale-context";
import { fullLogout } from "@/lib/auth/full-logout";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, MessageCircle } from "lucide-react";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";

export function UserMenu() {
    const { data: session } = useSession();
    const { t } = useLocale();
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    if (!session?.user) return null;

    const displayName = session.user.name ?? "";
    const username = session.user.username ?? session.user.email ?? "";

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full p-0">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary">
                                {displayName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                @{username}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFeedbackOpen(true)}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span>{t("feedback")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={fullLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{t("logout")}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
        </>
    );
}
