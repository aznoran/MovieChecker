"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/context/locale-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Menu,
  Clapperboard,
  BarChart3,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("navDiary"), icon: Clapperboard },
    { href: "/stats", label: t("navStats"), icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile trigger button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar - always visible on larger screens */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-40 md:w-64 md:border-r md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60 md:pt-14">
        <nav className="flex flex-col gap-1 p-4">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              {t("appName")}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-4">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
