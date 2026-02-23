"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Clapperboard,
    UserPlus,
    Loader2,
    AlertCircle,
    Languages,
    CheckCircle2,
} from "lucide-react";
import {ThemeToggle} from "@/components/shared/theme-toggle";
import Link from "next/link";
import type {Locale} from "@/lib/i18n";

export function RegisterForm() {
    const {locale, setLocale, t} = useLocale();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const res = await fetch(`${apiUrl}/api/auth/register`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    username,
                    password,
                    displayName,
                    ...(email ? {email} : {}),
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(t("registrationSuccess"));
                setTimeout(() => router.push("/login"), 2000);
            } else if (res.status === 409) {
                setError(t("usernameAlreadyExists"));
            } else if (data.errors) {
                setError(data.errors.map((e: {message: string}) => e.message).join(". "));
            } else {
                setError(data.message || t("registrationFailed"));
            }
        } catch {
            setError(t("registrationFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background-main px-4">
            <div className="absolute top-4 right-4 flex items-center gap-1">
                <ThemeToggle/>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLocale}
                    className="gap-1.5 text-muted-foreground"
                >
                    <Languages className="h-4 w-4"/>
                    {locale.toUpperCase()}
                </Button>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <Clapperboard className="h-10 w-10"/>
                    </div>
                    <CardTitle className="text-2xl">{t("appName")}</CardTitle>
                    <CardDescription>
                        {t("createAccount")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        {error && (
                            <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
                                <AlertCircle className="h-4 w-4 shrink-0"/>
                                {error}
                            </p>
                        )}
                        {success && (
                            <p className="text-sm text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 shrink-0"/>
                                {success}
                            </p>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="username">
                                {t("username")}
                            </label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">
                                {t("email")} <span className="text-muted-foreground font-normal">({t("optional")})</span>
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="displayName">
                                {t("displayName")}
                            </label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder={t("displayNamePlaceholder")}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="password">
                                {t("password")}
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="new-password"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
                                    {t("pleaseWait")}
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4 mr-1.5"/>
                                    {t("register")}
                                </>
                            )}
                        </Button>

                        <p className="text-sm text-center text-muted-foreground">
                            {t("alreadyHaveAccount")}{" "}
                            <Link href="/login" className="text-primary hover:underline">
                                {t("signIn")}
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
