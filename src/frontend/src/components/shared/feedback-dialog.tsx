"use client";

import {useState} from "react";
import {useLocale} from "@/context/locale-context";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {Send, Mail, Copy, Check} from "lucide-react";

interface FeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({open, onOpenChange}: FeedbackDialogProps) {
    const {t} = useLocale();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{t("feedback")}</DialogTitle>
                    <DialogDescription>{t("feedbackDescription")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                    <a
                        href="https://t.me/infomcheck"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                        <Send className="h-5 w-5 text-blue-500 shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">Telegram</div>
                            <div className="text-xs text-muted-foreground">@infomcheck</div>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => handleCopy("@infomcheck", "tg", e)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                        >
                            {copiedKey === "tg"
                                ? <Check className="h-4 w-4 text-green-500"/>
                                : <Copy className="h-4 w-4"/>
                            }
                        </button>
                    </a>
                    <a
                        href="mailto:aznoranton1231@gmail.com"
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                        <Mail className="h-5 w-5 text-orange-500 shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">Email</div>
                            <div className="text-xs text-muted-foreground">aznoranton1231@gmail.com</div>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => handleCopy("aznoranton1231@gmail.com", "email", e)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                        >
                            {copiedKey === "email"
                                ? <Check className="h-4 w-4 text-green-500"/>
                                : <Copy className="h-4 w-4"/>
                            }
                        </button>
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}
