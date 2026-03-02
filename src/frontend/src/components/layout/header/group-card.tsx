"use client"

import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {useSession} from "next-auth/react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {getMyPermissions} from "@/lib/api/client";
import {GroupRole, GroupType} from "@/lib/api/generated";
import type {GroupDto} from "@/lib/api/generated";
import {ConfirmDialog} from "@/components/shared/confirm-dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldSeparator,
} from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Progress} from "@/components/ui/progress";
import {
    Lock,
    LockOpen,
    User,
    Crown,
    DoorOpen,
    Copy,
    Check,
    Settings,
    KeyRound,
    Shield,
    Eye,
    UserCog,
    ShieldCheck,
    UserMinus,
    AlertTriangle,
    ShieldEllipsis,
} from "lucide-react";
import {PermissionEditorDialog} from "./permission-editor-dialog";
import {SharePopover} from "./share-popover";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface GroupCardProps {
    group: GroupDto;
    onChangeRole: (groupId: number, userId: string, currentRole: GroupRole) => void;
    setError: (error: string) => void;
}

export function GroupCard({group: g, onChangeRole, setError}: GroupCardProps) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const {t} = useLocale();
    const {leaveGroup, kickMember, transferOwnership, generateOtp, updateGroupSettings} = useGroup();

    console.log("[GroupCard] session:", session, "userId:", userId);
    const currentMember = (g.members ?? []).find(m => m.userId === userId);
    const isOwner = userId === g.createdByUserId || currentMember?.role === GroupRole.Owner;
    const {data: permissions} = useQuery({
        queryKey: ["permissions", g.id],
        queryFn: () => getMyPermissions(g.id!),
        enabled: !!session && !!g.id,
    });
    // Fall back to role-based check if permissions API hasn't resolved yet
    const canManageMembers = permissions?.canManageMembers ?? isOwner;
    const canManageGroup = permissions?.canManageGroup ?? isOwner;

    // Local state for this card
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editGroupName, setEditGroupName] = useState("");
    const [settingsNameError, setSettingsNameError] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState<{
        code: string;
        expiresAt: string;
        remainingSeconds: number
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const [permissionEditorTarget, setPermissionEditorTarget] = useState<{
        userId: string;
        displayName: string;
        role: GroupRole;
    } | null>(null);

    const handleCopyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveGroupSettings = async () => {
        if (editGroupName.length > 50) {
            setSettingsNameError(t("groupNameTooLong"));
            return;
        }
        try {
            await updateGroupSettings(g.id!, {
                name: editGroupName.trim() || undefined,
            });
            setSettingsOpen(false);
            setEditGroupName("");
            setSettingsNameError("");
        } catch {
            setError(t("groupSettingsError"));
        }
    };

    const handleToggleGroupType = async () => {
        try {
            await updateGroupSettings(g.id!, {isPrivate: !g.isPrivate});
        } catch {
            setError(t("groupSettingsError"));
        }
    };

    const handleGenerateOtp = async () => {
        try {
            const result = await generateOtp(g.id!);
            setGeneratedOtp({...result, remainingSeconds: 10});

            const interval = setInterval(() => {
                setGeneratedOtp(prev => {
                    if (!prev || prev.remainingSeconds <= 0) {
                        clearInterval(interval);
                        return prev;
                    }
                    return {...prev, remainingSeconds: prev.remainingSeconds - 1};
                });
            }, 1000);

            setTimeout(() => {
                clearInterval(interval);
                setGeneratedOtp(null);
            }, 10 * 1000);
        } catch {
            setError(t("otpGenerateError"));
        }
    };

    return (
        <FieldGroup
            className="bg-muted/30 border border-border/50 rounded-xl p-4 hover:bg-muted/40 transition-colors">
            <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                        {g.groupType === GroupType.Private ? (
                            <div
                                className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Lock className="h-4 w-4 text-red-500"/>
                            </div>
                        ) : g.groupType === GroupType.Public ? (
                            <div
                                className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <LockOpen className="h-4 w-4 text-green-500"/>
                            </div>
                        ) : (
                            <div
                                className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <User className="h-4 w-4 text-muted-foreground"/>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm truncate" title={g.name ?? undefined}>{g.name}</span>
                            {isOwner && <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0"/>}
                        </div>
                        {g.groupType === GroupType.Private && (
                            <span className="text-xs text-muted-foreground">
                                {t("privateGroup")}
                            </span>
                        )}
                    </div>
                </div>
                <ConfirmDialog
                    trigger={
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                            <DoorOpen className="h-3.5 w-3.5 mr-1.5"/>
                            {t("leave")}
                        </Button>
                    }
                    onConfirm={async () => {
                        try {
                            await leaveGroup(g.id!);
                        } catch {
                            setError(t("failedToAdd"));
                        }
                    }}
                    title={t("leaveGroup")}
                    description={t("leaveGroupConfirm")}
                    confirmText={t("leaveGroup")}
                    cancelText={t("cancel")}
                    variant="destructive"
                    icon={<DoorOpen className="h-6 w-6"/>}
                />
            </div>

            {/* Invite code + share popover */}
            {g.inviteCode && (canManageMembers || !g.isPrivate) && (
                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/40">
                    <code className="pl-2 text-sm font-mono flex-1 font-semibold tracking-wide">
                        {" " + g.inviteCode}
                    </code>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-primary/10"
                        onClick={() => handleCopyCode(g.inviteCode!)}
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-primary"/> :
                            <Copy className="h-3.5 w-3.5"/>}
                    </Button>
                    <SharePopover
                        groupId={g.id!}
                        inviteCode={g.inviteCode}
                        isPublicGroup={!g.isPrivate}
                        canManage={isOwner || canManageMembers}
                    />
                </div>
            )}

            {/* Group Settings */}
            {canManageGroup && (
                <div className="">
                    <FieldSeparator className="my-0.5"/>
                    <div className="space-y-4 pt-6">
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{t("groupSettings")}</p>

                        {/* Rename */}
                        {settingsOpen ? (
                            <div
                                className="space-y-3 bg-muted/30 border border-border/60 p-3 rounded-xl animate-in slide-in-from-top-2">
                                <Field>
                                    <FieldLabel className="text-sm font-medium">
                                        {t("renameGroup")}
                                    </FieldLabel>
                                    <Input
                                        value={editGroupName}
                                        onChange={(e) => {
                                            setEditGroupName(e.target.value);
                                            setSettingsNameError(e.target.value.length > 50 ? t("groupNameTooLong") : "");
                                        }}
                                        placeholder={g.name ?? undefined}
                                        className="h-9 bg-background border-border/60"
                                        aria-invalid={!!settingsNameError}
                                    />
                                    {settingsNameError && <FieldError>{settingsNameError}</FieldError>}
                                </Field>
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 flex-1 border-border/60"
                                        onClick={() => {
                                            setSettingsOpen(false);
                                            setEditGroupName("");
                                            setSettingsNameError("");
                                        }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-9 flex-1 bg-primary hover:bg-primary/90"
                                        onClick={handleSaveGroupSettings}
                                        disabled={!!settingsNameError}
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1.5"/>
                                        {t("save")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs w-full border-border/60 hover:bg-primary/5 hover:border-primary/40"
                                    onClick={() => {
                                        setSettingsOpen(true);
                                        setEditGroupName(g.name ?? "");
                                    }}
                                >
                                    <Settings className="h-3.5 w-3.5 mr-1.5"/>
                                    {t("renameGroup")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-xs w-full border-border/60 hover:bg-primary/5 hover:border-primary/40"
                                    onClick={handleToggleGroupType}
                                >
                                    {g.isPrivate ? (
                                        <>
                                            <LockOpen className="h-3.5 w-3.5 mr-1.5"/>
                                            {t("switchToPublic")}
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-3.5 w-3.5 mr-1.5"/>
                                            {t("switchToPrivate")}
                                        </>
                                    )}
                                </Button>

                                {/* Default role selector */}
                                {g.isPrivate ? (
                                    <Field>
                                        <FieldLabel className="text-xs font-medium">
                                            {t("defaultRole")}
                                        </FieldLabel>
                                        <Select
                                            value={g.defaultRole ?? GroupRole.Member}
                                            onValueChange={async (value) => {
                                                try {
                                                    await updateGroupSettings(g.id!, {defaultRole: value as GroupRole});
                                                } catch {
                                                    setError(t("groupSettingsError"));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-9 text-xs bg-background border-border/60">
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={GroupRole.Viewer}>
                                                    <div className="flex items-center gap-2">
                                                        <Eye className="h-3.5 w-3.5"/>
                                                        {t("roleViewer")}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value={GroupRole.Member}>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5"/>
                                                        {t("roleMember")}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value={GroupRole.Admin}>
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="h-3.5 w-3.5"/>
                                                        {t("roleAdmin")}
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldDescription className="text-xs">
                                            {t("defaultRoleDescription")}
                                        </FieldDescription>
                                    </Field>
                                ) : (
                                    <Field>
                                        <FieldLabel className="text-xs font-medium">
                                            {t("defaultRole")}
                                        </FieldLabel>
                                        <div
                                            className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border border-border/40 text-xs text-muted-foreground">
                                            <Eye className="h-3.5 w-3.5"/>
                                            {t("roleViewer")}
                                        </div>
                                        <FieldDescription className="text-xs">
                                            {t("defaultRoleDescription")}
                                        </FieldDescription>
                                    </Field>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* OTP Management for private groups */}
            {g.isPrivate && canManageMembers && (
                <div className="">
                    <FieldSeparator className="my-0.5"/>
                    <div className="space-y-4 pt-6">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs w-full border-border/60 hover:bg-primary/5 hover:border-primary/40"
                            onClick={handleGenerateOtp}
                            disabled={generatedOtp != null}
                        >
                            <KeyRound className="h-3.5 w-3.5 mr-1.5"/>
                            {t("generateOtp")}
                        </Button>

                        {/* Show generated OTP */}
                        {generatedOtp && (
                            <div
                                className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 p-3 rounded-xl space-y-2.5 animate-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-primary/90 uppercase tracking-wide">
                                        {t("otpGenerated")}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse"/>
                                        <span className="text-xs font-bold text-primary tabular-nums">
                                            {generatedOtp.remainingSeconds}s
                                        </span>
                                    </div>
                                </div>

                                <Progress
                                    value={(generatedOtp.remainingSeconds / 10) * 100}
                                    className="h-1.5"
                                />

                                <div className="bg-muted/50 backdrop-blur-sm p-3 rounded-lg shadow-sm">
                                    <code
                                        className="text-3xl font-mono font-bold text-primary block text-center tracking-[0.4em] drop-shadow-sm">
                                        {generatedOtp.code}
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-full text-xs border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => handleCopyCode(generatedOtp.code)}
                                >
                                    {copied ?
                                        <Check className="h-4 w-4 mr-2"/> :
                                        <Copy className="h-4 w-4 mr-2"/>}
                                    {t("copyCode")}
                                </Button>
                            </div>
                        )}

                    </div>
                </div>
            )}

            <FieldSeparator className="my-1"/>

            {/* Members list */}
            <FieldGroup className="space-y-2">
                <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{t("members")}</p>
                <div className="space-y-1.5">
                    {(g.members ?? []).map((m) => {
                        const isMemberOwner = m.userId === g.createdByUserId || m.role === GroupRole.Owner;
                        const isSelf = m.userId === userId;

                        let roleIcon = <User className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>;
                        let roleLabel = t("roleMember");

                        if (m.role === GroupRole.Owner) {
                            roleIcon = <Crown className="h-4 w-4 text-yellow-500 shrink-0"/>;
                            roleLabel = t("roleOwner");
                        } else if (m.role === GroupRole.Admin) {
                            roleIcon = <Shield className="h-4 w-4 text-blue-500 shrink-0"/>;
                            roleLabel = t("roleAdmin");
                        } else if (m.role === GroupRole.Viewer) {
                            roleIcon = <Eye className="h-4 w-4 text-gray-500 shrink-0"/>;
                            roleLabel = t("roleViewer");
                        }

                        return (
                            <div
                                key={m.userId}
                                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-2.5 text-sm min-w-0 flex-1">
                                    <div
                                        className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        {roleIcon}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="truncate font-medium">
                                            {m.displayName}
                                            {isSelf && (
                                                <span className="text-muted-foreground text-xs ml-1.5 font-normal">
                                                    ({t("you")})
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            {roleLabel}
                                            {m.hasCustomPermissions && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0"/>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="pr-1.5">
                                                        <div className="flex items-center gap-2">
                                                            {t("customPermissionsWarning")}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Member management actions */}
                                {canManageMembers && !isSelf && !isMemberOwner && (
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        {isOwner && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 hover:bg-amber-500/10 hover:text-amber-500 rounded-md"
                                                    title={t("permissionEditor")}
                                                    onClick={() => setPermissionEditorTarget({
                                                        userId: m.userId!,
                                                        displayName: m.displayName ?? "",
                                                        role: m.role!,
                                                    })}
                                                >
                                                    <ShieldEllipsis className="h-3.5 w-3.5"/>
                                                </Button>
                                                <ConfirmDialog
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-500 rounded-md"
                                                            title={t("changeRole")}
                                                        >
                                                            <UserCog className="h-3.5 w-3.5"/>
                                                        </Button>
                                                    }
                                                    onConfirm={async () => {
                                                        try {
                                                            await onChangeRole(g.id!, m.userId!, m.role!);
                                                        } catch {
                                                            setError(t("errorChangingRole"));
                                                        }
                                                    }}
                                                    title={t("changeRoleConfirm")}
                                                    description={t("changeRoleDescription")}
                                                    confirmText={t("changeRole")}
                                                    cancelText={t("cancel")}
                                                    variant="destructive"
                                                    icon={<ShieldCheck className="h-6 w-6"/>}
                                                />
                                                <ConfirmDialog
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 hover:bg-yellow-500/10 hover:text-yellow-500 rounded-md"
                                                            title={t("transferOwnership")}
                                                        >
                                                            <ShieldCheck className="h-3 w-3"/>
                                                        </Button>
                                                    }
                                                    onConfirm={async () => {
                                                        try {
                                                            await transferOwnership(g.id!, m.userId!);
                                                        } catch {
                                                            setError(t("failedToTransfer"));
                                                        }
                                                    }}
                                                    title={t("transferOwnership")}
                                                    description={t("transferConfirm")}
                                                    confirmText={t("transferOwnership")}
                                                    cancelText={t("cancel")}
                                                    variant="destructive"
                                                    icon={<UserMinus className="h-6 w-6"/>}
                                                />
                                            </>
                                        )}
                                        <ConfirmDialog
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:text-destructive"
                                                    title={t("kickMember")}
                                                >
                                                    <UserMinus className="h-3 w-3"/>
                                                </Button>
                                            }
                                            onConfirm={async () => {
                                                try {
                                                    await kickMember(g.id!, m.userId!);
                                                } catch {
                                                    setError(t("failedToKick"));
                                                }
                                            }}
                                            title={t("kickMember")}
                                            description={t("kickConfirm")}
                                            confirmText={t("kickMember")}
                                            cancelText={t("cancel")}
                                            variant="destructive"
                                            icon={<UserMinus className="h-6 w-6"/>}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </FieldGroup>

            {permissionEditorTarget && (
                <PermissionEditorDialog
                    open={!!permissionEditorTarget}
                    onClose={() => setPermissionEditorTarget(null)}
                    groupId={g.id!}
                    userId={permissionEditorTarget.userId}
                    displayName={permissionEditorTarget.displayName}
                    role={permissionEditorTarget.role}
                />
            )}
        </FieldGroup>
    );
}
