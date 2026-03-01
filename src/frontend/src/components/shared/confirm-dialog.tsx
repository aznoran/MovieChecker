"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
    trigger: React.ReactNode;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant?: "default" | "destructive" | "outline";
    icon?: React.ReactNode;
}

export function ConfirmDialog({
                                  trigger,
                                  onConfirm,
                                  title,
                                  description,
                                  confirmText,
                                  cancelText,
                                  variant = "default",
                                  icon,
                              }: ConfirmDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent className="bg-card" size="sm">
                <AlertDialogHeader>
                    {icon && (
                        <AlertDialogMedia
                            className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
                        >
                            {icon}
                        </AlertDialogMedia>
                    )}
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        variant="outline"
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        variant={variant}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
