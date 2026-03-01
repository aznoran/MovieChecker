"use client"

import {useLocale} from "@/context/locale-context";
import {GroupRole} from "@/lib/api/generated";
import {Button} from "@/components/ui/button";
import {Field, FieldLabel} from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Eye, User, Shield} from "lucide-react";

interface RoleChangeDialogProps {
    roleChangeDialog: { groupId: number; userId: string; currentRole: GroupRole } | null;
    selectedNewRole: GroupRole | null;
    onRoleChange: (role: GroupRole) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function RoleChangeDialog({
    roleChangeDialog,
    selectedNewRole,
    onRoleChange,
    onConfirm,
    onCancel,
}: RoleChangeDialogProps) {
    const {t} = useLocale();

    return (
        <Dialog open={roleChangeDialog !== null} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("changeRole")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {roleChangeDialog && (
                        <>
                            <div className="space-y-2">
                                <FieldLabel>{t("currentRole")}</FieldLabel>
                                <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                                    {roleChangeDialog.currentRole === GroupRole.Viewer && (<div className="flex items-center gap-2"><Eye /> {t("roleViewer")}</div>)}
                                    {roleChangeDialog.currentRole === GroupRole.Member && (<div className="flex items-center gap-2"><User /> {t("roleMember")}</div>)}
                                    {roleChangeDialog.currentRole === GroupRole.Admin && (<div className="flex items-center gap-2"><Shield /> {t("roleAdmin")}</div>)}
                                </div>
                            </div>

                            <Field>
                                <FieldLabel>{t("selectNewRole")}</FieldLabel>
                                <Select
                                    value={selectedNewRole ?? undefined}
                                    onValueChange={(value) => onRoleChange(value as GroupRole)}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={GroupRole.Viewer}>
                                            <div className="flex items-center gap-2">
                                                <Eye className="h-4 w-4" />
                                                {t("roleViewer")}
                                            </div>
                                        </SelectItem>
                                        <SelectItem value={GroupRole.Member}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                {t("roleMember")}
                                            </div>
                                        </SelectItem>
                                        <SelectItem value={GroupRole.Admin}>
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4" />
                                                {t("roleAdmin")}
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <div className="flex gap-2 justify-end pt-2">
                                <Button variant="ghost" onClick={onCancel}>
                                    {t("cancel")}
                                </Button>
                                <Button onClick={onConfirm}>
                                    {t("save")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
