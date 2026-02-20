"use client"

import {useState} from "react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {GroupRole, GroupType} from "@/lib/api/generated";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {FieldGroup, FieldSeparator} from "@/components/ui/field";
import {ScrollArea} from "@/components/ui/scroll-area";
import {UsersRound} from "lucide-react";
import {CreateGroupForm} from "./create-group-form";
import {JoinGroupForm} from "./join-group-form";
import {GroupCard} from "./group-card";
import {RoleChangeDialog} from "./role-change-dialog";

interface GroupManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GroupManagementDialog({open, onOpenChange}: GroupManagementDialogProps) {
    const {t} = useLocale();
    const {groups, updateMemberRole} = useGroup();

    const [error, setError] = useState("");
    const [roleChangeDialog, setRoleChangeDialog] = useState<{ groupId: number; userId: number; currentRole: GroupRole } | null>(null);
    const [selectedNewRole, setSelectedNewRole] = useState<GroupRole | null>(null);

    const handleChangeRole = async (groupId: number, userId: number, currentRole: GroupRole) => {
        setRoleChangeDialog({ groupId, userId, currentRole });
        setSelectedNewRole(currentRole);
    };

    const handleConfirmRoleChange = async () => {
        if (!roleChangeDialog || selectedNewRole === null) return;
        const { groupId, userId } = roleChangeDialog;
        try {
            await updateMemberRole(groupId, userId, selectedNewRole);
            setRoleChangeDialog(null);
            setSelectedNewRole(null);
        } catch {
            setError(t("roleUpdateError"));
        }
    };

    const handleCancelRoleChange = () => {
        setRoleChangeDialog(null);
        setSelectedNewRole(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <UsersRound className="h-5 w-5"/>
                            {t("groups")}
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea>
                        <div className="space-y-1 pr-2" style={{maxHeight: "calc(85vh - 120px)"}}>
                            <FieldGroup className="bg-muted/30 border border-border/50 rounded-xl p-5 gap-5">
                                <CreateGroupForm setError={setError}/>
                            </FieldGroup>
                            <FieldSeparator className="p-6"/>
                            <FieldGroup className="bg-muted/30 border border-border/50 rounded-xl p-5 gap-5">
                                <JoinGroupForm setError={setError}/>
                            </FieldGroup>

                            {error && (
                                <div
                                    className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <div className="h-2 w-2 rounded-full bg-destructive"/>
                                    {error}
                                </div>
                            )}
                            <FieldSeparator className="p-6"/>
                            {/* Group list */}
                            {groups.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground/90 px-1">
                                        {t("yourGroups")}
                                    </h3>
                                    <FieldGroup>
                                        {groups.filter((g) => g.groupType !== GroupType.Personal).map((g) => (
                                            <GroupCard
                                                key={g.id}
                                                group={g}
                                                onChangeRole={handleChangeRole}
                                                setError={setError}
                                            />
                                        ))}
                                    </FieldGroup>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <RoleChangeDialog
                roleChangeDialog={roleChangeDialog}
                selectedNewRole={selectedNewRole}
                onRoleChange={setSelectedNewRole}
                onConfirm={handleConfirmRoleChange}
                onCancel={handleCancelRoleChange}
            />
        </>
    );
}
