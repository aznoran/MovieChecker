"use client"

import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {GroupType} from "@/lib/api/generated";
import {Button} from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {User, UsersRound, Lock, LockOpen, Loader2} from "lucide-react";

interface GroupSwitcherProps {
    onOpenGroupDialog: () => void;
}

export function GroupSwitcher({onOpenGroupDialog}: GroupSwitcherProps) {
    const {t} = useLocale();
    const {groups, personalGroup, activeGroupId, setActiveGroupId, isLoading} = useGroup();

    return (
        <>
            <Select
                value={activeGroupId?.toString() ?? personalGroup?.id?.toString() ?? ""}
                onValueChange={(v) => setActiveGroupId(parseInt(v))}
                disabled={isLoading}
            >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                    ) : (
                        <SelectValue/>
                    )}
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                    {personalGroup && (
                        <SelectItem value={personalGroup.id!.toString()}>
                            <User className="h-3 w-3"/>
                            {t("personal")}
                        </SelectItem>
                    )}
                    {groups.filter((g) => g.groupType !== GroupType.Personal).map((g) => (
                        <SelectItem key={g.id} value={g.id!.toString()}>
                            <div className="flex items-center gap-1.5">
                                {g.groupType === GroupType.Private ? (
                                    <Lock className="h-3 w-3 text-red-500"/>
                                ) : g.groupType === GroupType.Public ? (
                                    <LockOpen className="h-3 w-3 text-green-500"/>
                                ) : (
                                    <User className="h-3 w-3"/>
                                )}
                                {g.name}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                variant="ghost"
                size="sm"
                onClick={onOpenGroupDialog}
                className="text-muted-foreground"
            >
                <UsersRound className="h-4 w-4"/>
            </Button>
        </>
    );
}
