"use client";

import {useState, useMemo, useEffect, Suspense} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
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
    Eye,
    EyeOff,
} from "lucide-react";
import {ThemeToggle} from "@/components/theme-toggle";
import type {Locale} from "@/lib/i18n";
import {AxiosError} from "axios";

interface FieldErrors {
    username?: string;
    password?: string;
    displayName?: string;
}

function LoginForm() {
    const {locale, setLocale, t} = useLocale();
    const searchParams = useSearchParams();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {login, register, isAuthenticated} = useAuth();
    const router = useRouter();

    // Check for register and session expired parameters on mount
    useEffect(() => {
        const registerParam = searchParams.get('register');
        if (registerParam === 'true') {
            setIsRegister(true);
        }
        
        // Check for session expired parameter
        const sessionExpired = searchParams.get('sessionExpired');
        if (sessionExpired === 'true') {
            setError(t("authError"));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]); // Only depend on searchParams, not t

    // Real-time frontend validation
    const validationErrors = useMemo((): FieldErrors => {
        if (!isRegister) return {};

        const errors: FieldErrors = {};

        // Username validation
        if (username.length > 0) {
            if (username.length < 3) {
                errors.username = t("usernameTooShort");
            } else if (username.length > 50) {
                errors.username = t("usernameTooLong");
            } else if (/[а-яА-ЯёЁ]/.test(username)) {
                // Check for Cyrillic characters
                errors.username = t("usernameHasCyrillic");
            } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                errors.username = t("usernameInvalidChars");
            }
        }

        // Password validation
        if (password.length > 0) {
            if (password !== password.trim()) {
                errors.password = t("passwordHasSpaces");
            } else if (password.length < 8) {
                errors.password = t("passwordTooShort");
            } else if (password.length > 50) {
                errors.password = t("passwordTooLong");
            } else if (/[а-яА-ЯёЁ]/.test(password)) {
                errors.password  = t("passwordHasCyrillic");
            } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                errors.username = t("passwordInvalidChars");
            } else {
                const hasUpper = /[A-Z]/.test(password);
                const hasLower = /[a-z]/.test(password);
                const hasDigit = /\d/.test(password);

                if (!hasUpper || !hasLower || !hasDigit) {
                    errors.password = t("passwordMissingRequirements");
                }
            }
        }

        // Display name validation - only validate if user has entered a display name
        if (displayName.length > 0) {
            if (displayName !== displayName.trim()) {
                errors.displayName = t("displayNameHasSpaces");
            } else if (displayName.length < 2) {
                errors.displayName = t("displayNameTooShort");
            } else if (displayName.length > 50) {
                errors.displayName = t("displayNameTooLong");
            }
        }

        return errors;
    }, [isRegister, username, password, displayName, t]);

    // Get the error for a specific field (server error takes precedence)
    const getFieldError = (field: keyof FieldErrors): string | undefined => {
        return fieldErrors[field] || (touched[field] ? validationErrors[field] : undefined);
    };

    if (isAuthenticated) {
        router.push("/");
        return null;
    }

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const handleBlur = (field: string) => {
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const parseBackendError = (err: unknown): string => {
        if (err instanceof AxiosError && err.response?.data) {
            const data = err.response.data;

            // Handle validation errors with errors array
            if (data.errors && Array.isArray(data.errors)) {
                const newFieldErrors: FieldErrors = {};

                for (const validationError of data.errors) {
                    const field = validationError.field?.toLowerCase();
                    const message = validationError.message;

                    if (field === "username") {
                        newFieldErrors.username = message;
                    } else if (field === "password") {
                        newFieldErrors.password = message;
                    } else if (field === "displayname") {
                        newFieldErrors.displayName = message;
                    }
                }

                if (Object.keys(newFieldErrors).length > 0) {
                    setFieldErrors(newFieldErrors);
                    return t("fixValidationErrors");
                }
            }
            else if (data.message) {
                return data.message;
            }
        }

        return isRegister ? t("registrationFailed") : t("loginFailed");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setFieldErrors({});
        setLoading(true);

        // Check for frontend validation errors before submitting
        if (isRegister && Object.keys(validationErrors).length > 0) {
            setTouched({username: true, password: true, displayName: true});
            setError(t("fixValidationErrors"));
            setLoading(false);
            return;
        }

        try {
            if (isRegister) {
                await register(username, password, displayName || username);
            } else {
                await login(username, password);
            }
            router.push("/");
        } catch (err) {
            setError(parseBackendError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
                        {isRegister ? t("createAccount") : t("signInDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5"/>
                                {t("username")}
                            </Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (fieldErrors.username) {
                                        setFieldErrors((prev) => ({...prev, username: undefined}));
                                    }
                                }}
                                onBlur={() => handleBlur("username")}
                                required
                                autoFocus
                                className={getFieldError("username") ? "border-destructive" : ""}
                            />
                            {getFieldError("username") && (
                                <p className="text-xs text-destructive">{getFieldError("username")}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5"/>
                                {t("password")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) {
                                            setFieldErrors((prev) => ({...prev, password: undefined}));
                                        }
                                    }}
                                    onBlur={() => handleBlur("password")}
                                    required
                                    className={getFieldError("password") ? "border-destructive pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {getFieldError("password") && (
                                <p className="text-xs text-destructive">{getFieldError("password")}</p>
                            )}
                        </div>

                        {isRegister && (
                            <div className="space-y-2">
                                <Label htmlFor="displayName" className="flex items-center gap-1.5">
                                    <UserPlus className="h-3.5 w-3.5"/>
                                    {t("displayName")}
                                </Label>
                                <Input
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => {
                                        setDisplayName(e.target.value);
                                        if (fieldErrors.displayName) {
                                            setFieldErrors((prev) => ({...prev, displayName: undefined}));
                                        }
                                    }}
                                    onBlur={() => handleBlur("displayName")}
                                    placeholder={t("displayNamePlaceholder")}
                                    className={getFieldError("displayName") ? "border-destructive" : ""}
                                />
                                {getFieldError("displayName") && (
                                    <p className="text-xs text-destructive">{getFieldError("displayName")}</p>
                                )}
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-destructive text-center flex items-center justify-center gap-1.5">
                                <AlertCircle className="h-4 w-4"/>
                                {error}
                            </p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin"/>
                                    {t("pleaseWait")}
                                </>
                            ) : isRegister ? (
                                <>
                                    <UserPlus className="h-4 w-4 mr-1.5"/>
                                    {t("register")}
                                </>
                            ) : (
                                <>
                                    <LogIn className="h-4 w-4 mr-1.5"/>
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
                                    setFieldErrors({});
                                    setTouched({});
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

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <Card className="w-full max-w-sm">
                    <CardContent className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </CardContent>
                </Card>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
