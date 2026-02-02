"use client";

import { useAuth } from "@/context/auth-context";
import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LoadingScreen } from "@/components/loading-screen";
import type { ReactNode } from "react";

export function LayoutContent({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  const pathname = usePathname();

  // Pages that don't need header/footer
  const isPublicPage = pathname === "/landing" || pathname === "/login";

  // Show full-page loader while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // For public pages, don't show header/footer
  if (isPublicPage) {
    return <>{children}</>;
  }

  // For authenticated pages, show header and footer
  return (
    <>
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
