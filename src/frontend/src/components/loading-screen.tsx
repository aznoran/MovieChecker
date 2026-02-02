"use client";

import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin text-white" />
    </div>
  );
}
