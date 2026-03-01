"use client";

import { useLocale } from "@/context/locale-context";
import packageJson from "../../../package.json";

export function Footer() {
  const { t } = useLocale();
  const version = packageJson.version;

  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto mb-4 px-4 py-4 text-center text-sm text-muted-foreground">
        {t("appName")} v{version}
      </div>
    </footer>
  );
}
