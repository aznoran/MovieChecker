"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
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
import type { Locale } from "@/lib/i18n";
import { GroupRole, GroupRoleLabels } from "@/types";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { groups, activeGroupId, setActiveGroupId, createGroup, joinGroup, leaveGroup, kickMember, transferOwnership, updateMemberRole, generateOtp, updatePassword } = useGroup();

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
  const [generatedOtps, setGeneratedOtps] = useState<Map<number, {code: string; expiresAt: string}>>(new Map());
  const [changePasswordGroupId, setChangePasswordGroupId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const links = [
    { href: "/", label: t("navDiary"), icon: Clapperboard },
    { href: "/stats", label: t("navStats"), icon: BarChart3 },
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

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinGroup(joinCode.trim(), joinPassword || undefined, joinOtp || undefined);
      setJoinCode("");
      setJoinPassword("");
      setJoinOtp("");
      setUseOtpMode(false);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.message || t("invalidCode"));
    }
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
    const roleOptions = [
      { value: GroupRole.Viewer, label: t("roleViewer") },
      { value: GroupRole.Member, label: t("roleMember") },
      { value: GroupRole.Admin, label: t("roleAdmin") },
    ];
    
    const roleLabels = roleOptions.map(r => `${r.value}: ${r.label}`).join("\n");
    const input = prompt(`${t("changeRole")}:\n${roleLabels}\n\nCurrent: ${currentRole}`);
    
    if (input === null) return;
    const newRole = parseInt(input);
    
    if (isNaN(newRole) || newRole < 0 || newRole > 2) {
      setError("Invalid role");
      return;
    }
    
    try {
      await updateMemberRole(groupId, userId, newRole);
    } catch {
      setError(t("roleUpdateError"));
    }
  };

  const handleGenerateOtp = async (groupId: number) => {
    try {
      const result = await generateOtp(groupId);
      setGeneratedOtps(prev => new Map(prev).set(groupId, result));
      // Clear after 30 minutes
      setTimeout(() => {
        setGeneratedOtps(prev => {
          const newMap = new Map(prev);
          newMap.delete(groupId);
          return newMap;
        });
      }, 30 * 60 * 1000);
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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold shrink-0">
              <Clapperboard className="h-5 w-5" />
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
                    <Icon className="h-4 w-4" />
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
                <UsersRound className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t("personal")}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    <div className="flex items-center gap-1.5">
                      {g.isPrivate ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
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
              <UsersRound className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="gap-1.5 text-muted-foreground"
            >
              <Languages className="h-4 w-4" />
              {locale.toUpperCase()}
            </Button>
            {user && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                {user.displayName}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              {t("groups")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create group */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">{t("createGroup")}</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="groupName" className="text-xs text-muted-foreground">
                    {t("groupName")}
                  </Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder={t("groupName")}
                    className="h-9"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  />
                </div>
                
                <div className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id="isPrivate"
                    checked={newGroupIsPrivate}
                    onCheckedChange={(checked) => setNewGroupIsPrivate(checked as boolean)}
                  />
                  <Label
                    htmlFor="isPrivate"
                    className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                  >
                    {newGroupIsPrivate ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    {newGroupIsPrivate ? t("privateGroup") : t("publicGroup")}
                  </Label>
                </div>
                
                {newGroupIsPrivate && (
                  <div className="space-y-1.5 pl-6 border-l-2 border-muted">
                    <Label htmlFor="groupPassword" className="text-xs text-muted-foreground">
                      {t("groupPassword")} ({t("optionalPassword").toLowerCase()})
                    </Label>
                    <Input
                      id="groupPassword"
                      type="password"
                      value={newGroupPassword}
                      onChange={(e) => setNewGroupPassword(e.target.value)}
                      placeholder={t("groupPassword")}
                      className="h-9"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t("optionalPassword")}
                    </p>
                  </div>
                )}
                
                <Button size="sm" className="w-full h-9" onClick={handleCreateGroup}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("createGroup")}
                </Button>
              </div>
            </div>

            {/* Join group */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-semibold">{t("joinGroup")}</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="joinCode" className="text-xs text-muted-foreground">
                    {t("enterInviteCode")}
                  </Label>
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder={t("enterInviteCode")}
                    className="h-9 font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                  />
                </div>
                
                {/* Toggle between Password and OTP */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {t("usePassword")} / {t("useOtp")}
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={!useOtpMode ? "default" : "outline"}
                      size="sm"
                      className="h-9 flex-1"
                      onClick={() => setUseOtpMode(false)}
                    >
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                      {t("usePassword")}
                    </Button>
                    <Button
                      variant={useOtpMode ? "default" : "outline"}
                      size="sm"
                      className="h-9 flex-1"
                      onClick={() => setUseOtpMode(true)}
                    >
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      {t("useOtp")}
                    </Button>
                  </div>
                </div>

                {!useOtpMode ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="joinPassword" className="text-xs text-muted-foreground">
                      {t("password")}
                    </Label>
                    <Input
                      id="joinPassword"
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder={t("enterPassword")}
                      className="h-9"
                      onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      {t("enterOtp")}
                    </Label>
                    <div className="flex justify-center bg-muted/50 p-3 rounded-lg">
                      <InputOTP
                        maxLength={6}
                        value={joinOtp}
                        onChange={(value) => setJoinOtp(value)}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {t("enterOtp")}
                    </p>
                  </div>
                )}
                
                <Button size="sm" className="w-full h-9" onClick={handleJoinGroup}>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {t("joinGroup")}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-sm text-center">
                {error}
              </div>
            )}

            {/* Group list */}
            {groups.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-semibold">{t("groups")}</p>
                <div className="space-y-3">
                  {groups.map((g) => {
                    const isOwner = user?.id === g.createdByUserId;
                    const currentUserMember = g.members.find(m => m.userId === user?.id);
                    const isAdmin = currentUserMember?.role === GroupRole.Admin;
                    const canManage = isOwner || isAdmin;
                    
                    return (
                      <div key={g.id} className="border rounded-lg p-3 space-y-3">
                        {/* Group header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {g.isPrivate ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <LockOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {isOwner && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                            <span className="font-medium text-sm">{g.name}</span>
                            {g.isPrivate && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                {t("privateGroup")}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleLeaveGroup(g.id)}
                          >
                            <DoorOpen className="h-3.5 w-3.5 mr-1" />
                            {t("leaveGroup")}
                          </Button>
                        </div>

                        {/* Invite code */}
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1">
                            {g.inviteCode}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleCopyCode(g.inviteCode)}
                          >
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>

                        {/* OTP Management for private groups (Owner/Admin only) */}
                        {g.isPrivate && canManage && (
                          <div className="space-y-2 pt-2 border-t">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => handleGenerateOtp(g.id)}
                              >
                                <Key className="h-3 w-3 mr-1" />
                                {t("generateOtp")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs flex-1"
                                onClick={() => setChangePasswordGroupId(g.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {t("changePassword")}
                              </Button>
                            </div>

                            {/* Show generated OTP */}
                            {generatedOtps.get(g.id) && (
                              <div className="bg-primary/5 border-2 border-primary/20 p-3 rounded-lg space-y-2">
                                <p className="text-xs font-semibold text-primary text-center">
                                  {t("otpGenerated")}:
                                </p>
                                <div className="bg-primary/10 p-3 rounded-md">
                                  <code className="text-2xl font-mono font-bold text-primary block text-center tracking-[0.3em]">
                                    {generatedOtps.get(g.id)!.code}
                                  </code>
                                </div>
                                <p className="text-xs text-primary/80 text-center font-medium">
                                  {t("otpExpiresIn")} 30 {t("otpMinutes")}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-full text-xs"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedOtps.get(g.id)!.code);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                  }}
                                >
                                  {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                  {t("copyCode")}
                                </Button>
                              </div>
                            )}

                            {/* Password change form */}
                            {changePasswordGroupId === g.id && (
                              <div className="bg-muted/50 border p-3 rounded-lg space-y-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`newPassword-${g.id}`} className="text-xs text-muted-foreground">
                                    {t("newPassword")} ({t("optionalPassword").toLowerCase()})
                                  </Label>
                                  <Input
                                    id={`newPassword-${g.id}`}
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder={t("newPassword")}
                                    className="h-8"
                                  />
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t("optionalPassword")}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-8 flex-1"
                                    onClick={() => handleUpdatePassword(g.id)}
                                  >
                                    {t("save")}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 flex-1"
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

                        {/* Members list */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">{t("members")}</p>
                          {g.members.map((m) => {
                            const isMemberOwner = m.userId === g.createdByUserId;
                            const isSelf = m.userId === user?.id;
                            
                            // Icon based on role
                            let roleIcon = <User className="h-3 w-3 text-muted-foreground shrink-0" />;
                            let roleLabel = t("roleMember");
                            
                            if (m.role === GroupRole.Owner) {
                              roleIcon = <Crown className="h-3 w-3 text-yellow-400 shrink-0" />;
                              roleLabel = t("roleOwner");
                            } else if (m.role === GroupRole.Admin) {
                              roleIcon = <Shield className="h-3 w-3 text-blue-400 shrink-0" />;
                              roleLabel = t("roleAdmin");
                            } else if (m.role === GroupRole.Viewer) {
                              roleIcon = <Eye className="h-3 w-3 text-gray-400 shrink-0" />;
                              roleLabel = t("roleViewer");
                            }
                            
                            return (
                              <div
                                key={m.userId}
                                className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50"
                              >
                                <div className="flex items-center gap-2 text-sm min-w-0">
                                  {roleIcon}
                                  <span className="truncate">
                                    {m.displayName}
                                    {isSelf && (
                                      <span className="text-muted-foreground ml-1">
                                        ({t("watchedByMe")})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                                    {roleLabel}
                                  </span>
                                </div>

                                {/* Owner/Admin actions on other members */}
                                {canManage && !isSelf && !isMemberOwner && (
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {isOwner && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-500"
                                          title={t("changeRole")}
                                          onClick={() => handleChangeRole(g.id, m.userId, m.role)}
                                        >
                                          <UserCog className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                          title={t("transferOwnership")}
                                          onClick={() => handleTransferOwnership(g.id, m.userId)}
                                        >
                                          <ShieldCheck className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      title={t("kickMember")}
                                      onClick={() => handleKickMember(g.id, m.userId)}
                                    >
                                      <UserMinus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
