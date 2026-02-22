"use client"

import {useState, useEffect, useCallback} from "react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {useLocale} from "@/context/locale-context";
import type {TranslationKeys} from "@/lib/i18n/en";
import {getMemberPermissions, updateMemberPermissions} from "@/lib/api/client";
import {GroupRole} from "@/lib/api/generated";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {RotateCcw, Loader2} from "lucide-react";

const PERMISSION_FLAGS = {
    ViewEntries: 1 << 0,
    CreateEntries: 1 << 1,
    EditOwnEntries: 1 << 2,
    EditAllEntries: 1 << 3,
    DeleteOwnEntries: 1 << 4,
    DeleteAllEntries: 1 << 5,
    RateSelf: 1 << 6,
    RateOthers: 1 << 7,
    ManageMembers: 1 << 8,
    ManageGroup: 1 << 9,
} as const;

type PermissionKey = keyof typeof PERMISSION_FLAGS;

const PERMISSION_KEYS: PermissionKey[] = [
    "ViewEntries",
    "CreateEntries",
    "EditOwnEntries",
    "EditAllEntries",
    "DeleteOwnEntries",
    "DeleteAllEntries",
    "RateSelf",
    "RateOthers",
    "ManageMembers",
    "ManageGroup",
];

const PERMISSION_I18N_MAP: Record<PermissionKey, TranslationKeys> = {
    ViewEntries: "permViewEntries",
    CreateEntries: "permCreateEntries",
    EditOwnEntries: "permEditOwnEntries",
    EditAllEntries: "permEditAllEntries",
    DeleteOwnEntries: "permDeleteOwnEntries",
    DeleteAllEntries: "permDeleteAllEntries",
    RateSelf: "permRateSelf",
    RateOthers: "permRateOthers",
    ManageMembers: "permManageMembers",
    ManageGroup: "permManageGroup",
};

interface PermissionEditorDialogProps {
    open: boolean;
    onClose: () => void;
    groupId: number;
    userId: number;
    displayName: string;
    role: GroupRole;
}

export function PermissionEditorDialog({
    open,
    onClose,
    groupId,
    userId,
    displayName,
    role,
}: PermissionEditorDialogProps) {
    const {t} = useLocale();
    const queryClient = useQueryClient();
    const [toggles, setToggles] = useState<Record<PermissionKey, boolean>>({} as Record<PermissionKey, boolean>);
    const [saving, setSaving] = useState(false);

    const {data, isLoading} = useQuery({
        queryKey: ["memberPermissions", groupId, userId],
        queryFn: () => getMemberPermissions(groupId, userId),
        enabled: open,
    });

    // Initialize toggles when data loads
    useEffect(() => {
        if (data) {
            const effective = data.effectivePermissionsFlags;
            const newToggles = {} as Record<PermissionKey, boolean>;
            for (const key of PERMISSION_KEYS) {
                newToggles[key] = (effective & PERMISSION_FLAGS[key]) !== 0;
            }
            setToggles(newToggles);
        }
    }, [data]);

    const roleDefaults = data?.roleDefaultFlags ?? 0;

    const isRoleDefault = useCallback(
        (key: PermissionKey) => (roleDefaults & PERMISSION_FLAGS[key]) !== 0,
        [roleDefaults]
    );

    const hasChangesFromRoleDefaults = useCallback(() => {
        if (!data) return false;
        for (const key of PERMISSION_KEYS) {
            if (toggles[key] !== isRoleDefault(key)) return true;
        }
        return false;
    }, [data, toggles, isRoleDefault]);

    const handleResetToDefaults = () => {
        const newToggles = {} as Record<PermissionKey, boolean>;
        for (const key of PERMISSION_KEYS) {
            newToggles[key] = isRoleDefault(key);
        }
        setToggles(newToggles);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let granted = 0;
            let revoked = 0;
            for (const key of PERMISSION_KEYS) {
                const flag = PERMISSION_FLAGS[key];
                const isDefault = isRoleDefault(key);
                const isEnabled = toggles[key];
                if (isEnabled && !isDefault) {
                    granted |= flag;
                } else if (!isEnabled && isDefault) {
                    revoked |= flag;
                }
            }
            await updateMemberPermissions(groupId, userId, granted, revoked);
            await queryClient.invalidateQueries({queryKey: ["groups"]});
            await queryClient.invalidateQueries({queryKey: ["permissions"]});
            await queryClient.invalidateQueries({queryKey: ["memberPermissions", groupId, userId]});
            toast.success(t("permissionsUpdated"));
            onClose();
        } catch {
            toast.error(t("permissionsUpdateError"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("permissionEditor")}</DialogTitle>
                    <DialogDescription>{displayName}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {PERMISSION_KEYS.map((key) => {
                            const defaultOn = isRoleDefault(key);
                            const currentOn = toggles[key] ?? defaultOn;
                            const isCustom = currentOn !== defaultOn;
                            const isManageGroup = key === "ManageGroup";
                            const disabled = isManageGroup && role !== GroupRole.Owner;

                            return (
                                <div
                                    key={key}
                                    className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                                        isCustom ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30 border border-border/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div
                                            className={`h-2 w-2 rounded-full shrink-0 ${
                                                defaultOn ? "bg-green-500" : "bg-muted-foreground/40"
                                            }`}
                                            title={defaultOn ? t("roleDefaultOn") : t("roleDefaultOff")}
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">
                                                {t(PERMISSION_I18N_MAP[key])}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {defaultOn ? t("roleDefaultOn") : t("roleDefaultOff")}
                                            </span>
                                        </div>
                                    </div>
                                    <Switch
                                        size="sm"
                                        checked={currentOn}
                                        onCheckedChange={(checked) => {
                                            setToggles((prev) => ({...prev, [key]: checked}));
                                        }}
                                        disabled={disabled}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="flex flex-row items-center gap-2">
                    {hasChangesFromRoleDefaults() && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="mr-auto"
                            onClick={handleResetToDefaults}
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5"/>
                            {t("resetToDefaults")}
                        </Button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || isLoading}
                        >
                            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>}
                            {t("save")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
