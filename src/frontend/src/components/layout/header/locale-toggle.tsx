"use client"

import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {Languages} from "lucide-react";
import type {Locale} from "@/lib/i18n";

export function LocaleToggle() {
    const {locale, setLocale} = useLocale();

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        void setLocale(next);
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="gap-1.5 text-muted-foreground min-w-[4rem]"
        >
            <Languages className="h-4 w-4"/>
            {locale.toUpperCase()}
        </Button>
    );
}
