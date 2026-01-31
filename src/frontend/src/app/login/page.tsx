"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/context/locale-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Clapperboard,
  User,
  Lock,
  UserPlus,
  LogIn,
  Loader2,
  AlertCircle,
  Languages,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/lib/i18n";

export default function LoginPage() {
  const { locale, setLocale, t } = useLocale();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthenticated) {
    router.push("/");
    return null;
  }

  const toggleLocale = () => {
    const next: Locale = locale === "en" ? "ru" : "en";
    setLocale(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password, displayName || username);
      } else {
        await login(username, password);
      }
      router.push("/");
    } catch {
      setError(isRegister ? t("registrationFailed") : t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLocale}
          className="gap-1.5 text-muted-foreground"
        >
          <Languages className="h-4 w-4" />
          {locale.toUpperCase()}
        </Button>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Clapperboard className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl">{t("appName")}</CardTitle>
          <CardDescription>
            {isRegister ? t("createAccount") : t("signInDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {t("username")}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {t("password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("displayName")}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("displayNamePlaceholder")}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {t("pleaseWait")}
                </>
              ) : isRegister ? (
                <>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {t("register")}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-1.5" />
                  {t("signIn")}
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? t("alreadyHaveAccount") : t("dontHaveAccount")}{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
              >
                {isRegister ? t("signIn") : t("register")}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
