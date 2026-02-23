"use client"

import {useState, useEffect, useCallback} from "react";
import {useLocale} from "@/context/locale-context";
import {createInviteLink, getInviteLinks, deleteInviteLink} from "@/lib/api/client";
import type {InviteLinkDto} from "@/lib/api/client";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {ConfirmDialog} from "@/components/shared/confirm-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Share2,
    Copy,
    Check,
    Plus,
    Trash2,
    Link,
    Clock,
    Users,
    Loader2,
    RefreshCw,
} from "lucide-react";
import {toast} from "sonner";

interface SharePopoverProps {
    groupId: number;
    inviteCode: string | null;
    isPublicGroup?: boolean;
    canManage?: boolean;
}

export function SharePopover({groupId, inviteCode, isPublicGroup = false, canManage = false}: SharePopoverProps) {
    const {t} = useLocale();
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [links, setLinks] = useState<InviteLinkDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Create form state (private groups only)
    const [expirationMinutes, setExpirationMinutes] = useState<string>("1440");
    const [maxUses, setMaxUses] = useState<string>("");

    const loadLinks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getInviteLinks(groupId);
            setLinks(data);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        if (open) {
            loadLinks();
        }
    }, [open, loadLinks]);

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success(t("linkCopied"), {position: "top-center"});
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCopyInviteCode = async () => {
        if (inviteCode) {
            await navigator.clipboard.writeText(inviteCode);
            setCopied("code");
            toast.success(t("copied"), {position: "top-center"});
            setTimeout(() => setCopied(null), 2000);
        }
    };


    const handleSetMaxUses = (value: string) => {
        if (0 <= Number(value) && Number(value) <= 999999) {
            setMaxUses(value);
        }
    };

    const handleCreateLink = async () => {
        try {
            setCreating(true);
            const expires = expirationMinutes === "never" ? undefined : parseInt(expirationMinutes);
            const parsedMax = maxUses ? parseInt(maxUses) : undefined;
            const max = parsedMax && parsedMax <= 999999 ? parsedMax : undefined;
            await createInviteLink(groupId, expires, max);
            toast.success(t("inviteLinkCreated"), {position: "top-center"});
            await loadLinks();
            setMaxUses("");
        } catch {
            toast.error(t("inviteLinkError"), {position: "top-center"});
        } finally {
            setCreating(false);
        }
    };

    const handleRegenerateLink = async () => {
        try {
            setCreating(true);
            // Delete all existing links
            for (const link of links) {
                await deleteInviteLink(groupId, link.id);
            }
            // Create a new permanent link
            await createInviteLink(groupId);
            toast.success(t("linkRegenerated"), {position: "top-center"});
            await loadLinks();
        } catch {
            toast.error(t("inviteLinkError"), {position: "top-center"});
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeLink = async (linkId: number) => {
        try {
            await deleteInviteLink(groupId, linkId);
            setLinks(prev => prev.filter(l => l.id !== linkId));
        } catch {
            // silently fail
        }
    };

    const formatExpiry = (expiresAt: string | null) => {
        if (!expiresAt) return t("durationNever");
        const date = new Date(expiresAt);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        if (diffMs <= 0) return t("linkExpired");
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 60) return `${diffMinutes}m`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d`;
    };

    const getJoinUrl = (link: InviteLinkDto) => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/join/${link.token}`;
    };

    const publicLink = isPublicGroup ? links[0] : null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    title={t("share")}
                >
                    <Share2 className="h-3.5 w-3.5"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b border-border/40">
                    <h4 className="text-sm font-semibold">{t("shareGroup")}</h4>
                </div>

                <div className="p-3 space-y-3">
                    {/* Copy Invite Code */}
                    {inviteCode && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t("inviteCode")}
                            </p>
                            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/40">
                                <code className="pl-1 text-sm font-mono flex-1 font-semibold tracking-wide">
                                    {inviteCode}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-primary/10"
                                    onClick={handleCopyInviteCode}
                                >
                                    {copied === "code" ? (
                                        <Check className="h-3.5 w-3.5 text-primary"/>
                                    ) : (
                                        <Copy className="h-3.5 w-3.5"/>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {isPublicGroup ? (
                        /* ── Public group: single permanent link ── */
                        <div className="space-y-2 pt-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t("inviteLink")}
                            </p>
                            {loading ? (
                                <div className="flex justify-center py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                                </div>
                            ) : publicLink ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/40">
                                        <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                                        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                                            {getJoinUrl(publicLink)}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-primary/10 shrink-0"
                                            onClick={() => handleCopy(getJoinUrl(publicLink), `link-${publicLink.id}`)}
                                        >
                                            {copied === `link-${publicLink.id}` ? (
                                                <Check className="h-3.5 w-3.5 text-primary"/>
                                            ) : (
                                                <Copy className="h-3.5 w-3.5"/>
                                            )}
                                        </Button>
                                    </div>
                                    {canManage && (
                                        <ConfirmDialog
                                            trigger={
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full h-8 text-xs"
                                                    disabled={creating}
                                                >
                                                    {creating ? (
                                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>
                                                    ) : (
                                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5"/>
                                                    )}
                                                    {t("regenerateLink")}
                                                </Button>
                                            }
                                            onConfirm={handleRegenerateLink}
                                            title={t("regenerateLink")}
                                            description={t("regenerateLinkConfirm")}
                                            confirmText={t("regenerateLink")}
                                            cancelText={t("cancel")}
                                            variant="destructive"
                                            icon={<RefreshCw className="h-6 w-6"/>}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                        {t("noActiveLinks")}
                                    </p>
                                    {canManage && (
                                        <Button
                                            size="sm"
                                            className="w-full h-8 text-xs"
                                            onClick={handleCreateLink}
                                            disabled={creating}
                                        >
                                            {creating ? (
                                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>
                                            ) : (
                                                <Plus className="h-3.5 w-3.5 mr-1.5"/>
                                            )}
                                            {t("createInviteLink")}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── Private group: full create/manage UI ── */
                        <>
                            <div className="space-y-2 pt-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {t("createInviteLink")}
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={expirationMinutes}
                                                onValueChange={setExpirationMinutes}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <Clock className="h-3 w-3 mr-1 text-muted-foreground"/>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="60">{t("duration1Hour")}</SelectItem>
                                                    <SelectItem value="360">{t("duration6Hours")}</SelectItem>
                                                    <SelectItem value="720">{t("duration12Hours")}</SelectItem>
                                                    <SelectItem value="1440">{t("duration1Day")}</SelectItem>
                                                    <SelectItem value="10080">{t("duration7Days")}</SelectItem>
                                                    <SelectItem value="never">{t("durationNever")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="999999"
                                            value={maxUses}
                                            onChange={(e) => handleSetMaxUses(e.target.value)}
                                            placeholder={t("noLimit")}
                                            className="h-8 text-xs"
                                            title={t("maxUses")}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3"/>
                                        <span>{t("maxUses")}: {maxUses || t("unlimited")}</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full h-8 text-xs"
                                        onClick={handleCreateLink}
                                        disabled={creating}
                                    >
                                        {creating ? (
                                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin"/>
                                        ) : (
                                            <Plus className="h-3.5 w-3.5 mr-1.5"/>
                                        )}
                                        {t("createInviteLink")}
                                    </Button>
                                </div>
                            </div>

                            {/* Active Links */}
                            <div className="space-y-2 pt-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {t("activeInviteLinks")}
                                </p>
                                {loading ? (
                                    <div className="flex justify-center py-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                                    </div>
                                ) : links.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">
                                        {t("noActiveLinks")}
                                    </p>
                                ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {links.map((link) => (
                                            <div
                                                key={link.id}
                                                className="flex items-center gap-1.5 bg-muted/30 p-2 rounded-lg border border-border/40 text-xs"
                                            >
                                                <Link className="h-3 w-3 text-muted-foreground shrink-0"/>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-muted-foreground">
                                                            {formatExpiry(link.expiresAt)}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {link.useCount}{link.maxUses ? `/${link.maxUses}` : ""} {t("uses")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:bg-primary/10"
                                                    onClick={() => handleCopy(getJoinUrl(link), `link-${link.id}`)}
                                                >
                                                    {copied === `link-${link.id}` ? (
                                                        <Check className="h-3 w-3 text-primary"/>
                                                    ) : (
                                                        <Copy className="h-3 w-3"/>
                                                    )}
                                                </Button>
                                                <ConfirmDialog
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3 w-3"/>
                                                        </Button>
                                                    }
                                                    onConfirm={() => handleRevokeLink(link.id)}
                                                    title={t("revokeLink")}
                                                    description={t("revokeLinkConfirm")}
                                                    confirmText={t("revokeLink")}
                                                    cancelText={t("cancel")}
                                                    variant="destructive"
                                                    icon={<Trash2 className="h-6 w-6"/>}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
