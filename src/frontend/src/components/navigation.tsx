"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { useGroup } from "@/context/group-context";
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
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { groups, activeGroupId, activeGroup, setActiveGroupId, createGroup, joinGroup, leaveGroup } = useGroup();

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
    if (!confirm(t("leaveGroupConfirm"))) return;
    await leaveGroup(id);
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
                <div className="space-y-2">
                  {groups.map((g) => (
                    <div key={g.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{g.name}</span>
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
                      <div className="text-xs text-muted-foreground">
                        {t("members")}: {g.members.map((m) => m.displayName).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
