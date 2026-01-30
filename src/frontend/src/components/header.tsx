"use client"

import {useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {ConfirmDialog} from "@/components/confirm-dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Checkbox} from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {cn} from "@/lib/utils";
import {
    Clapperboard,
    BarChart3,
    LogOut,
    User,
    Languages,
    UsersRound,
    Plus,
    UserPlus,
    Copy,
    Check,
    DoorOpen,
    Crown,
    UserMinus,
    ShieldCheck,
    Lock,
    LockOpen,
    UserCog,
    Shield,
    Eye,
    Key,
    RefreshCw,
} from "lucide-react";
import type {Locale} from "@/lib/i18n";
import {GroupRole} from "@/types";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {ThemeToggle} from "@/components/theme-toggle";
import {checkInviteCode} from "@/lib/api";
import {Progress} from "@/components/ui/progress";
import {ScrollArea} from "@/components/ui/scroll-area";

export function Header() {
    const pathname = usePathname();
    const {user, logout} = useAuth();
    const {locale, setLocale, t} = useLocale();
    const {
        groups,
        activeGroupId,
        setActiveGroupId,
        createGroup,
        joinGroup,
        leaveGroup,
        kickMember,
        transferOwnership,
        updateMemberRole,
        generateOtp,
        updatePassword
    } = useGroup();

    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
    const [newGroupPassword, setNewGroupPassword] = useState("");
    const [joinCode, setJoinCode] = useState("");
    const [joinPassword, setJoinPassword] = useState("");
    const [joinOtp, setJoinOtp] = useState("");
    const [useOtpMode, setUseOtpMode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");
    const [generatedOtps, setGeneratedOtps] = useState<Map<number, { code: string; expiresAt: string; remainingSeconds: number }>>(new Map());
    const [changePasswordGroupId, setChangePasswordGroupId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState("");
    
    // Role change dialog state
    const [roleChangeDialog, setRoleChangeDialog] = useState<{ groupId: number; userId: number; currentRole: GroupRole } | null>(null);
    const [selectedNewRole, setSelectedNewRole] = useState<GroupRole | null>(null);

    // Two-step join process state
    const [joinStep, setJoinStep] = useState<"code" | "auth">("code");
    const [groupToJoin, setGroupToJoin] = useState<{
        name: string;
        isPrivate: boolean;
        hasPassword: boolean;
    } | null>(null);

    const links = [
        {href: "/", label: t("navDiary"), icon: Clapperboard},
        {href: "/stats", label: t("navStats"), icon: BarChart3},
    ];

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            await createGroup(newGroupName.trim(), newGroupIsPrivate, newGroupPassword || undefined);
            setNewGroupName("");
            setNewGroupIsPrivate(false);
            setNewGroupPassword("");
            setError("");
        } catch {
            setError(t("failedToAdd"));
        }
    };

    const handleCheckInviteCode = async () => {
        if (!joinCode.trim()) return;
        try {
            setError("");
            const result = await checkInviteCode(joinCode.trim());

            if (!result.exists) {
                setError(t("invalidCode"));
                return;
            }

            // If group is not private, join directly
            if (!result.isPrivate) {
                await joinGroup(joinCode.trim());
                setJoinCode("");
                setJoinStep("code");
                setGroupToJoin(null);
                return;
            }

            // Group is private, show auth fields
            setGroupToJoin({
                name: result.groupName || "",
                isPrivate: result.isPrivate,
                hasPassword: result.hasPassword,
            });

            // Set default auth mode based on whether password exists
            setUseOtpMode(!result.hasPassword);
            setJoinStep("auth");
        } catch {
            setError(t("invalidCode"));
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;
        try {
            await joinGroup(joinCode.trim(), joinPassword || undefined, joinOtp || undefined);
            setJoinCode("");
            setJoinPassword("");
            setJoinOtp("");
            setUseOtpMode(false);
            setError("");
            setJoinStep("code");
            setGroupToJoin(null);
        } catch {
            setError(t("invalidCode"));
        }
    };

    const handleBackToCode = () => {
        setJoinStep("code");
        setGroupToJoin(null);
        setJoinPassword("");
        setJoinOtp("");
        setUseOtpMode(false);
        setError("");
    };

    const handleLeaveGroup = async (id: number) => {
        if (!confirm(t("leaveGroupConfirm"))) return;
        try {
            await leaveGroup(id);
        } catch {
            setError(t("failedToAdd"));
        }
    };

    const handleKickMember = async (groupId: number, userId: number) => {
        if (!confirm(t("kickConfirm"))) return;
        try {
            await kickMember(groupId, userId);
        } catch {
            setError(t("failedToKick"));
        }
    };

    const handleTransferOwnership = async (groupId: number, newOwnerId: number) => {
        if (!confirm(t("transferConfirm"))) return;
        try {
            await transferOwnership(groupId, newOwnerId);
        } catch {
            setError(t("failedToTransfer"));
        }
    };

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

    const handleGenerateOtp = async (groupId: number) => {
        try {
            const result = await generateOtp(groupId);
            setGeneratedOtps(prev => new Map(prev).set(groupId, { ...result, remainingSeconds: 10 }));

            // Countdown timer - update every second
            const interval = setInterval(() => {
                setGeneratedOtps(prev => {
                    const current = prev.get(groupId);
                    if (!current || current.remainingSeconds <= 0) {
                        clearInterval(interval);
                        return prev;
                    }
                    const newMap = new Map(prev);
                    newMap.set(groupId, { ...current, remainingSeconds: current.remainingSeconds - 1 });
                    return newMap;
                });
            }, 1000);

            // Clear after 10 seconds
            setTimeout(() => {
                clearInterval(interval);
                setGeneratedOtps(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(groupId);
                    return newMap;
                });
            }, 10 * 1000);
        } catch {
            setError(t("otpGenerateError"));
        }
    };

    const handleUpdatePassword = async (groupId: number) => {
        try {
            await updatePassword(groupId, newPassword || undefined);
            setChangePasswordGroupId(null);
            setNewPassword("");
        } catch {
            setError(t("passwordUpdateError"));
        }
    };

    const handleCopyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <header
                className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 text-lg font-bold shrink-0">
                            <Clapperboard className="h-5 w-5"/>
                            <span className="hidden sm:inline">{t("appName")}</span>
                        </Link>
                        <nav className="flex items-center gap-1">
                            {links.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                            pathname === link.href
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                        )}
                                    >
                                        <Icon className="h-4 w-4"/>
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>
                        <Select
                            value={activeGroupId?.toString() ?? "personal"}
                            onValueChange={(v) => setActiveGroupId(v === "personal" ? undefined : parseInt(v))}
                        >
                            <SelectTrigger className="w-[180px] h-8 text-sm">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="personal">
                                    <User />
                                    {t("personal")}
                                </SelectItem>
                                {groups.map((g) => (
                                    <SelectItem key={g.id} value={g.id.toString()}>
                                        <div className="flex items-center gap-1.5">
                                            {g.isPrivate ? <Lock color="red" className="h-3 w-3"/> :
                                                <LockOpen color="green" className="h-3 w-3"/>}
                                            {g.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGroupDialogOpen(true)}
                            className="text-muted-foreground"
                        >
                            <UsersRound className="h-4 w-4"/>
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle/>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleLocale}
                            className="gap-1.5 text-muted-foreground"
                        >
                            <Languages className="h-4 w-4"/>
                            {locale.toUpperCase()}
                        </Button>
                        {user && (
                            <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                                <User className="h-4 w-4"/>
                                {user.displayName}
                              </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={logout}>
                            <LogOut className="h-4 w-4 mr-1.5"/>
                            <span className="hidden sm:inline">{t("logout")}</span>
                        </Button>
                    </div>
                </div>
            </header>

            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <UsersRound className="h-5 w-5"/>
                            {t("groups")}
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea>
                        <div className="space-y-1 pr-2" style={{maxHeight: "calc(85vh - 120px)"}}>
                            {/* Create and Join Groups - Apple-style card */}
                            <FieldGroup className="bg-muted/30 border border-border/50 rounded-xl p-5 gap-5">
                                {/* Create Group Section */}
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
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder={t("groupName")}
                                                className="h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                                                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                                            />
                                        </Field>

                                        <Field orientation="horizontal" className="items-center py-1">
                                            <Checkbox
                                                id="isPrivate"
                                                checked={newGroupIsPrivate}
                                                onCheckedChange={(checked) => setNewGroupIsPrivate(checked as boolean)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            <FieldLabel
                                                htmlFor="isPrivate"
                                                className="cursor-pointer flex items-center gap-2 text-sm font-medium"
                                            >
                                                {newGroupIsPrivate ? <Lock color="red" className="h-4 w-4 text-primary"/> :
                                                    <LockOpen color="green" className="h-4 w-4 text-muted-foreground"/>}
                                                {newGroupIsPrivate ? t("privateGroup") : t("publicGroup")}
                                            </FieldLabel>
                                        </Field>

                                        {newGroupIsPrivate && (
                                            <div className="pl-5 border-l-2 border-primary/30 space-y-4 animate-in slide-in-from-left-2">
                                                <Field>
                                                    <FieldLabel htmlFor="groupPassword" className="text-sm font-medium">
                                                        {t("groupPassword")}
                                                    </FieldLabel>
                                                    <Input
                                                        id="groupPassword"
                                                        type="password"
                                                        value={newGroupPassword}
                                                        onChange={(e) => setNewGroupPassword(e.target.value)}
                                                        placeholder={t("groupPassword")}
                                                        className="h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                                                        onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                                                    />
                                                    <FieldDescription className="text-xs">
                                                        {t("optionalPassword")}
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
                            </FieldGroup>
                            <FieldSeparator className="p-6"/>
                            <FieldGroup className="bg-muted/30 border border-border/50 rounded-xl p-5 gap-5">
                                {/* Join Group Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground/90">
                                        {t("joinGroup")}
                                    </h3>
                                    <FieldGroup className="gap-4">
                                        {joinStep === "code" ? (
                                            <>
                                                <Field>
                                                    <FieldLabel htmlFor="joinCode" className="text-sm font-medium">
                                                        {t("enterInviteCode")}
                                                    </FieldLabel>
                                                    <Input
                                                        id="joinCode"
                                                        value={joinCode}
                                                        onChange={(e) => setJoinCode(e.target.value)}
                                                        placeholder={t("enterInviteCode")}
                                                        className="h-10 font-mono bg-background border-border/60 focus-visible:ring-primary/20"
                                                        onKeyDown={(e) => e.key === "Enter" && handleCheckInviteCode()}
                                                    />
                                                </Field>

                                                <Button
                                                    size="sm"
                                                    className="w-full h-10 bg-primary hover:bg-primary/90 shadow-sm"
                                                    onClick={handleCheckInviteCode}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-2"/>
                                                    {t("continue")}
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                {/* Auth step - show group name and required fields */}
                                                <div
                                                    className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="h-4 w-4 text-primary"/>
                                                        <span className="font-medium">{groupToJoin?.name}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {groupToJoin?.hasPassword
                                                            ? t("privateGroupWithPassword")
                                                            : t("privateGroupOtpOnly")}
                                                    </p>
                                                </div>

                                                {groupToJoin?.hasPassword && (
                                                    <Field>
                                                        <FieldLabel className="text-sm font-medium mb-2">
                                                            {t("authenticationMethod")}
                                                        </FieldLabel>
                                                        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                                                            <Button
                                                                variant={!useOtpMode ? "default" : "ghost"}
                                                                size="sm"
                                                                className={cn(
                                                                    "h-9 flex-1 transition-all",
                                                                    !useOtpMode && "shadow-sm"
                                                                )}
                                                                onClick={() => setUseOtpMode(false)}
                                                            >
                                                                <Lock className="h-3.5 w-3.5 mr-2"/>
                                                                {t("password")}
                                                            </Button>
                                                            <Button
                                                                variant={useOtpMode ? "default" : "ghost"}
                                                                size="sm"
                                                                className={cn(
                                                                    "h-9 flex-1 transition-all",
                                                                    useOtpMode && "shadow-sm"
                                                                )}
                                                                onClick={() => setUseOtpMode(true)}
                                                            >
                                                                <Key className="h-3.5 w-3.5 mr-2"/>
                                                                {t("otp")}
                                                            </Button>
                                                        </div>
                                                    </Field>
                                                )}

                                                {!useOtpMode && groupToJoin?.hasPassword ? (
                                                    <Field>
                                                        <FieldLabel htmlFor="joinPassword" className="text-sm font-medium">
                                                            {t("password")}
                                                        </FieldLabel>
                                                        <Input
                                                            id="joinPassword"
                                                            type="password"
                                                            value={joinPassword}
                                                            onChange={(e) => setJoinPassword(e.target.value)}
                                                            placeholder={t("enterPassword")}
                                                            className="h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                                                            onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                                                        />
                                                    </Field>
                                                ) : (
                                                    <Field>
                                                        <FieldLabel className="text-sm font-medium">
                                                            {t("enterOtp")}
                                                        </FieldLabel>
                                                        <div
                                                            className="flex justify-center bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/40">
                                                            <InputOTP
                                                                maxLength={6}
                                                                value={joinOtp}
                                                                onChange={(value) => setJoinOtp(value)}
                                                            >
                                                                <InputOTPGroup>
                                                                    <InputOTPSlot index={0}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                    <InputOTPSlot index={1}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                    <InputOTPSlot index={2}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                    <InputOTPSlot index={3}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                    <InputOTPSlot index={4}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                    <InputOTPSlot index={5}
                                                                                  className="border-border/60 data-[active=true]:border-primary"/>
                                                                </InputOTPGroup>
                                                            </InputOTP>
                                                        </div>
                                                        <FieldDescription className="text-center text-xs">
                                                            {t("enterSixDigitCode")}
                                                        </FieldDescription>
                                                    </Field>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-10"
                                                        onClick={handleBackToCode}
                                                    >
                                                        {t("back")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-10 bg-primary hover:bg-primary/90 shadow-sm"
                                                        onClick={handleJoinGroup}
                                                    >
                                                        <UserPlus className="h-4 w-4 mr-2"/>
                                                        {t("joinGroup")}
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </FieldGroup>
                                </div>
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
                                    <FieldGroup className="gap-3">
                                        {groups.map((g) => {
                                            const isOwner = user?.id === g.createdByUserId;
                                            const currentUserMember = g.members.find(m => m.userId === user?.id);
                                            const isAdmin = currentUserMember?.role === GroupRole.Admin;
                                            const canManage = isOwner || isAdmin;

                                            return (
                                                <FieldGroup key={g.id}
                                                            className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-4 hover:bg-muted/40 transition-colors">
                                                    {/* Group header */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex items-center gap-1.5">
                                                                {g.isPrivate ? (
                                                                    <div
                                                                        className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                        <Lock
                                                                            color="red"
                                                                            className="h-4 w-4 text-primary"/>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                                                        <LockOpen
                                                                            color="green"
                                                                            className="h-4 w-4 text-muted-foreground"/>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                <span
                                                                    className="font-semibold text-sm">{g.name}</span>
                                                                    {isOwner &&
                                                                        <Crown
                                                                            className="h-3.5 w-3.5 text-yellow-500"/>}
                                                                </div>
                                                                {g.isPrivate && (
                                                                    <span
                                                                        className="text-xs text-muted-foreground">
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
                                                                    onClick={() => handleLeaveGroup(g.id)}
                                                                >
                                                                    <DoorOpen className="h-3.5 w-3.5 mr-1.5"/>
                                                                    {t("leave")}
                                                                </Button>
                                                            }
                                                            onConfirm={async () => {
                                                                try {
                                                                    await leaveGroup(g.id);
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

                                                    {/* Invite code */}
                                                    <div
                                                        className="flex items-center gap-2 bg-background/60 p-2.5 rounded-lg border border-border/40">
                                                        <code
                                                            className="text-sm font-mono flex-1 font-semibold tracking-wide">
                                                            {g.inviteCode}
                                                        </code>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 hover:bg-primary/10"
                                                            onClick={() => handleCopyCode(g.inviteCode)}
                                                        >
                                                            {copied ? <Check className="h-3.5 w-3.5 text-primary"/> :
                                                                <Copy className="h-3.5 w-3.5"/>}
                                                        </Button>
                                                    </div>

                                                    {/* OTP Management for private groups (Owner/Admin only) */}
                                                    {g.isPrivate && canManage && (
                                                        <div className="space-y-3">
                                                            <FieldSeparator className="my-1"/>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9 text-xs flex-1 border-border/60 hover:bg-primary/5 hover:border-primary/40"
                                                                    onClick={() => handleGenerateOtp(g.id)}
                                                                >
                                                                    <Key className="h-3.5 w-3.5 mr-1.5"/>
                                                                    {t("generateOtp")}
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9 text-xs flex-1 border-border/60 hover:bg-primary/5 hover:border-primary/40"
                                                                    onClick={() => setChangePasswordGroupId(g.id)}
                                                                >
                                                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                                                                    {t("changePassword")}
                                                                </Button>
                                                            </div>

                                                            {/* Show generated OTP */}
                                                            {generatedOtps.get(g.id) && (
                                                                <div
                                                                    className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 p-4 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xs font-semibold text-primary/90 uppercase tracking-wide">
                                                                            {t("otpGenerated")}
                                                                        </p>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse"/>
                                                                            <span className="text-xs font-bold text-primary tabular-nums">
                                                                            {generatedOtps.get(g.id)!.remainingSeconds}s
                                                                        </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Progress bar */}
                                                                    <Progress
                                                                        value={(generatedOtps.get(g.id)!.remainingSeconds / 10) * 100}
                                                                        className="h-1.5"
                                                                    />

                                                                    <div
                                                                        className="bg-background/80 backdrop-blur-sm p-4 rounded-lg shadow-sm">
                                                                        <code
                                                                            className="text-3xl font-mono font-bold text-primary block text-center tracking-[0.4em] drop-shadow-sm">
                                                                            {generatedOtps.get(g.id)!.code}
                                                                        </code>
                                                                    </div>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-9 w-full text-xs border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(generatedOtps.get(g.id)!.code);
                                                                            setCopied(true);
                                                                            setTimeout(() => setCopied(false), 2000);
                                                                        }}
                                                                    >
                                                                        {copied ?
                                                                            <Check
                                                                                className="h-4 w-4 mr-2"/> :
                                                                            <Copy className="h-4 w-4 mr-2"/>}
                                                                        {t("copyCode")}
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {/* Password change form */}
                                                            {changePasswordGroupId === g.id && (
                                                                <div
                                                                    className="bg-background/60 border border-border/60 p-4 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                                                                    <Field>
                                                                        <FieldLabel htmlFor={`newPassword-${g.id}`}
                                                                                    className="text-sm font-medium">
                                                                            {t("newPassword")}
                                                                        </FieldLabel>
                                                                        <Input
                                                                            id={`newPassword-${g.id}`}
                                                                            type="password"
                                                                            value={newPassword}
                                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                                            placeholder={t("newPassword")}
                                                                            className="h-9 bg-background border-border/60"
                                                                        />
                                                                        <FieldDescription className="text-xs">
                                                                            {t("optionalPassword")}
                                                                        </FieldDescription>
                                                                    </Field>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-9 flex-1 bg-primary hover:bg-primary/90"
                                                                            onClick={() => handleUpdatePassword(g.id)}
                                                                        >
                                                                            <Check className="h-3.5 w-3.5 mr-1.5"/>
                                                                            {t("save")}
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-9 flex-1 border-border/60"
                                                                            onClick={() => {
                                                                                setChangePasswordGroupId(null);
                                                                                setNewPassword("");
                                                                            }}
                                                                        >
                                                                            {t("cancel")}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <FieldSeparator className="my-1"/>

                                                    {/* Members list */}
                                                    <FieldGroup className="space-y-2">
                                                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{t("members")}</p>
                                                        <div className="space-y-1.5">
                                                            {g.members.map((m) => {
                                                                const isMemberOwner = m.userId === g.createdByUserId;
                                                                const isSelf = m.userId === user?.id;

                                                                // Icon based on role
                                                                let roleIcon = <User
                                                                    className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>;
                                                                let roleLabel = t("roleMember");

                                                                if (m.role === GroupRole.Owner) {
                                                                    roleIcon =
                                                                        <Crown
                                                                            className="h-4 w-4 text-yellow-500 shrink-0"/>;
                                                                    roleLabel = t("roleOwner");
                                                                } else if (m.role === GroupRole.Admin) {
                                                                    roleIcon =
                                                                        <Shield
                                                                            className="h-4 w-4 text-blue-500 shrink-0"/>;
                                                                    roleLabel = t("roleAdmin");
                                                                } else if (m.role === GroupRole.Viewer) {
                                                                    roleIcon =
                                                                        <Eye className="h-4 w-4 text-gray-500 shrink-0"/>;
                                                                    roleLabel = t("roleViewer");
                                                                }

                                                                return (
                                                                    <div
                                                                        key={m.userId}
                                                                        className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-background/60 border border-border/40 hover:bg-background/80 transition-colors"
                                                                    >
                                                                        <div
                                                                            className="flex items-center gap-2.5 text-sm min-w-0 flex-1">
                                                                            <div
                                                                                className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                                {roleIcon}
                                                                            </div>
                                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                            <span className="truncate font-medium">
                                                                                {m.displayName}
                                                                                {isSelf && (
                                                                                    <span
                                                                                        className="text-muted-foreground text-xs ml-1.5 font-normal">
                                                                                        ({t("you")})
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                                <span
                                                                                    className="text-xs text-muted-foreground">
                                                                                {roleLabel}
                                                                            </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Owner/Admin actions on other members */}
                                                                        {canManage && !isSelf && !isMemberOwner && (
                                                                            <div
                                                                                className="flex items-center gap-1 shrink-0 ml-2">
                                                                                {isOwner && (
                                                                                    <>
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
                                                                                                    await handleChangeRole(g.id, m.userId, m.role);
                                                                                                } catch {
                                                                                                    setError(t(""));
                                                                                                }
                                                                                            }}
                                                                                            title={t("")}
                                                                                            description={t("")}
                                                                                            confirmText={t("")}
                                                                                            cancelText={t("cancel")}
                                                                                            variant="destructive"
                                                                                            icon={<ShieldCheck className="h-6 w-6"/>}
                                                                                        />
                                                                                        <ConfirmDialog
                                                                                            trigger={
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-md"
                                                                                                    title={t("transferOwnership")}
                                                                                                >
                                                                                                    <ShieldCheck className="h-3 w-3"/>
                                                                                                </Button>
                                                                                            }
                                                                                            onConfirm={async () => {
                                                                                                try {
                                                                                                    await handleTransferOwnership(g.id, m.userId);
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
                                                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                                                                            title={t("kickMember")}
                                                                                            onClick={() => handleKickMember(g.id, m.userId)}
                                                                                        >
                                                                                            <UserMinus className="h-3 w-3"/>
                                                                                        </Button>
                                                                                    }
                                                                                    onConfirm={async () => {
                                                                                        try {
                                                                                            await kickMember(g.id, m.userId);
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
                                                </FieldGroup>
                                            );
                                        })}
                                    </FieldGroup>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Role Change Dialog */}
            <Dialog open={roleChangeDialog !== null} onOpenChange={(open) => !open && handleCancelRoleChange()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("changeRole")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {roleChangeDialog && (
                            <>
                                <div className="space-y-2">
                                    <FieldLabel>{t("currentRole")}</FieldLabel>
                                    <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                                        {roleChangeDialog.currentRole === GroupRole.Viewer && t("roleViewer")}
                                        {roleChangeDialog.currentRole === GroupRole.Member && t("roleMember")}
                                        {roleChangeDialog.currentRole === GroupRole.Admin && t("roleAdmin")}
                                    </div>
                                </div>

                                <Field>
                                    <FieldLabel>{t("selectNewRole")}</FieldLabel>
                                    <Select
                                        value={selectedNewRole?.toString()}
                                        onValueChange={(value) => setSelectedNewRole(parseInt(value) as GroupRole)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={GroupRole.Viewer.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-4 w-4" />
                                                    {t("roleViewer")}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value={GroupRole.Member.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4" />
                                                    {t("roleMember")}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value={GroupRole.Admin.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4" />
                                                    {t("roleAdmin")}
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" onClick={handleCancelRoleChange}>
                                        {t("cancel")}
                                    </Button>
                                    <Button onClick={handleConfirmRoleChange}>
                                        {t("save")}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
