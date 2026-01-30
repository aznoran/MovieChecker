"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { groups, activeGroupId, setActiveGroupId, createGroup, joinGroup, leaveGroup, kickMember, transferOwnership } = useGroup();
  const confirm = useConfirm();

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

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
      await createGroup(newGroupName.trim());
      setNewGroupName("");
      setError("");
    } catch {
      setError(t("failedToAdd"));
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinGroup(joinCode.trim());
      setJoinCode("");
      setError("");
    } catch {
      setError(t("invalidCode"));
    }
  };

  const handleLeaveGroup = async (id: number) => {
    const confirmed = await confirm({
      title: t("leaveGroup"),
      description: t("leaveGroupConfirm"),
      confirmText: t("leaveGroup"),
      cancelText: t("cancel"),
      variant: "destructive",
      icon: <DoorOpen className="h-6 w-6" />,
    });
    if (!confirmed) return;
    try {
      await leaveGroup(id);
    } catch {
      setError(t("failedToAdd"));
    }
  };

  const handleKickMember = async (groupId: number, userId: number) => {
    const confirmed = await confirm({
      title: t("kickMember"),
      description: t("kickConfirm"),
      confirmText: t("kickMember"),
      cancelText: t("cancel"),
      variant: "destructive",
      icon: <UserMinus className="h-6 w-6" />,
    });
    if (!confirmed) return;
    try {
      await kickMember(groupId, userId);
    } catch {
      setError(t("failedToKick"));
    }
  };

  const handleTransferOwnership = async (groupId: number, newOwnerId: number) => {
    const confirmed = await confirm({
      title: t("transferOwnership"),
      description: t("transferConfirm"),
      confirmText: t("transferOwnership"),
      cancelText: t("cancel"),
      variant: "destructive",
      icon: <ShieldCheck className="h-6 w-6" />,
    });
    if (!confirmed) return;
    try {
      await transferOwnership(groupId, newOwnerId);
    } catch {
      setError(t("failedToTransfer"));
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
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <UsersRound className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">{t("personal")}</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name}
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

          <div className="space-y-4">
            {/* Create group */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("createGroup")}</p>
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t("groupName")}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                />
                <Button size="sm" className="h-8 shrink-0" onClick={handleCreateGroup}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Join group */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("joinGroup")}</p>
              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t("enterInviteCode")}
                  className="h-8 text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                />
                <Button size="sm" className="h-8 shrink-0" onClick={handleJoinGroup}>
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {/* Group list */}
            {groups.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("groups")}</p>
                <div className="space-y-3">
                  {groups.map((g) => {
                    const isOwner = user?.id === g.createdByUserId;
                    return (
                      <div key={g.id} className="border rounded-lg p-3 space-y-3">
                        {/* Group header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isOwner && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
                            <span className="font-medium text-sm">{g.name}</span>
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

                        {/* Members list */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">{t("members")}</p>
                          {g.members.map((m) => {
                            const isMemberOwner = m.userId === g.createdByUserId;
                            const isSelf = m.userId === user?.id;
                            return (
                              <div
                                key={m.userId}
                                className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50"
                              >
                                <div className="flex items-center gap-2 text-sm min-w-0">
                                  {isMemberOwner ? (
                                    <Crown className="h-3 w-3 text-yellow-400 shrink-0" />
                                  ) : (
                                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {m.displayName}
                                    {isSelf && (
                                      <span className="text-muted-foreground ml-1">
                                        ({t("watchedByMe")})
                                      </span>
                                    )}
                                  </span>
                                  {isMemberOwner && (
                                    <span className="text-[10px] text-yellow-500 font-medium shrink-0">
                                      {t("owner")}
                                    </span>
                                  )}
                                </div>

                                {/* Owner actions on other members */}
                                {isOwner && !isSelf && (
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                      title={t("transferOwnership")}
                                      onClick={() => handleTransferOwnership(g.id, m.userId)}
                                    >
                                      <ShieldCheck className="h-3 w-3" />
                                    </Button>
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
