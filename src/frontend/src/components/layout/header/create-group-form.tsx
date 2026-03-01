"use client"

import {useState} from "react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {GroupRole} from "@/lib/api/generated";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldGroup,
} from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {cn} from "@/lib/utils";
import {Plus, Lock, LockOpen, Eye, User, Shield} from "lucide-react";
import {toast} from "sonner";

interface CreateGroupFormProps {
    setError: (error: string) => void;
}

export function CreateGroupForm({setError}: CreateGroupFormProps) {
    const {t} = useLocale();
    const {createGroup} = useGroup();

    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
    const [newGroupDefaultRole, setNewGroupDefaultRole] = useState<GroupRole>(GroupRole.Member);
    const [groupNameError, setGroupNameError] = useState("");

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error(t("groupNameRequired"), { position: "top-center" });
            return;
        }
        if (newGroupName.length > 50) {
            setGroupNameError(t("groupNameTooLong"));
            toast.error(t("groupNameTooLong"), { position: "top-center" });
            return;
        }
        try {
            const defaultRole = newGroupIsPrivate ? newGroupDefaultRole : GroupRole.Viewer;
            await createGroup(newGroupName.trim(), newGroupIsPrivate, defaultRole);
            setNewGroupName("");
            setNewGroupIsPrivate(false);
            setNewGroupDefaultRole(GroupRole.Member);
            setError("");
            setGroupNameError("");
        } catch {
            setError(t("failedToAdd"));
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/90">
                {t("createGroup")}
            </h3>
            <FieldGroup className="gap-4">
                <Field>
                    <FieldLabel htmlFor="groupName" className="text-sm font-medium">
                        {t("groupName")}
                    </FieldLabel>
                    <Input
                        id="groupName"
                        value={newGroupName}
                        onChange={(e) => {
                            setNewGroupName(e.target.value);
                            setGroupNameError(e.target.value.length > 50 ? t("groupNameTooLong") : "");
                        }}
                        placeholder={t("groupName")}
                        className="h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                        aria-invalid={!!groupNameError}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                    />
                    {groupNameError && <FieldError>{groupNameError}</FieldError>}
                </Field>

                <Field>
                    <FieldLabel className="text-sm font-medium">
                        {t("type")}
                    </FieldLabel>
                    <div className="flex rounded-lg border border-border/60 overflow-hidden">
                        <Button
                            variant={!newGroupIsPrivate ? "default" : "secondary"}
                            className="flex-1 flex items-center justify-center gap-2 h-10 text-sm font-medium transition-colors"
                            onClick={() => setNewGroupIsPrivate(false)}
                        >
                            <LockOpen className="h-3.5 w-3.5"/>
                            {t("publicGroup")}
                        </Button>
                        <Button
                            variant={newGroupIsPrivate ? "default" : "secondary"}
                            className="flex-1 flex items-center justify-center gap-2 h-10 text-sm font-medium transition-colors"
                            onClick={() => setNewGroupIsPrivate(true)}
                        >
                            <Lock className="h-3.5 w-3.5"/>
                            {t("privateGroup")}
                        </Button>
                    </div>
                </Field>

                {newGroupIsPrivate && (
                    <div className="pl-5 border-l-2 border-primary/30 space-y-4 animate-in slide-in-from-left-2">
                        <Field>
                            <FieldLabel htmlFor="defaultRole" className="text-sm font-medium">
                                {t("defaultRole")}
                            </FieldLabel>
                            <Select
                                value={newGroupDefaultRole}
                                onValueChange={(value) => setNewGroupDefaultRole(value as GroupRole)}
                            >
                                <SelectTrigger className="h-10 bg-background border-border/60">
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
                            <FieldDescription className="text-xs">
                                {t("defaultRoleDescription")}
                            </FieldDescription>
                        </Field>
                    </div>
                )}

                <Button
                    size="sm"
                    className="w-full h-10 bg-primary hover:bg-primary/90 shadow-sm"
                    onClick={handleCreateGroup}
                >
                    <Plus className="h-4 w-4 mr-2"/>
                    {t("createGroup")}
                </Button>
            </FieldGroup>
        </div>
    );
}
