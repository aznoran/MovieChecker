"use client"

import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {LogOut} from "lucide-react";

export function UserMenu() {
    const {user, logout} = useAuth();
    const {t} = useLocale();

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary">
                            {(user.displayName ?? "").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            @{user.username}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/*<DropdownMenuItem onClick={() => router.push("/settings")}>*/}
                {/*    <Settings className="mr-2 h-4 w-4" />*/}
                {/*    <span>{t("settings")}</span>*/}
                {/*</DropdownMenuItem>*/}
                {/*<DropdownMenuSeparator />*/}
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("logout")}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
