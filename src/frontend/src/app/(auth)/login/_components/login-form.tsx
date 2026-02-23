"use client";

import {useState, useEffect, useMemo, useRef} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useAuth} from "@/context/auth-context";
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
import {Controller} from "react-hook-form";
import {
    Field,
    FieldLabel,
    FieldError,
} from "@/components/ui/field";
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
import {ThemeToggle} from "@/components/shared/theme-toggle";
import type {Locale} from "@/lib/i18n";
import {AxiosError} from "axios";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";

export function LoginForm() {
    const {locale, setLocale, t} = useLocale();
    const searchParams = useSearchParams();
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const {login, register, isAuthenticated} = useAuth();
    const router = useRouter();
    const hasRedirected = useRef(false);

    const loginSchema = useMemo(() => z.object({
        username: z.string().min(1, t("usernameRequired")),
        password: z.string().min(1, t("passwordRequired")),
        displayName: z.string().optional(),
    }), [t]);

    const registerSchema = useMemo(() => z.object({
        username: z.string()
            .min(3, t("usernameTooShort"))
            .max(50, t("usernameTooLong"))
            .refine(v => !/[а-яА-ЯёЁ]/.test(v), t("usernameHasCyrillic"))
            .refine(v => /^[a-zA-Z0-9_-]+$/.test(v), t("usernameInvalidChars")),
        password: z.string()
            .min(8, t("passwordTooShort"))
            .max(50, t("passwordTooLong"))
            .refine(v => v === v.trim(), t("passwordHasSpaces"))
            .refine(v => !/[а-яА-ЯёЁ]/.test(v), t("passwordHasCyrillic"))
            .refine(v => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v), t("passwordMissingRequirements")),
        displayName: z.string()
            .refine(v => !v || v === v.trim(), t("displayNameHasSpaces"))
            .refine(v => !v || v.length >= 2, t("displayNameTooShort"))
            .refine(v => !v || v.length <= 50, t("displayNameTooLong"))
            .optional()
            .or(z.literal("")),
    }), [t]);

    type FormValues = z.infer<typeof registerSchema>;

    const form = useForm<FormValues>({
        resolver: zodResolver(isRegister ? registerSchema : loginSchema),
        defaultValues: {
            username: "",
            password: "",
            displayName: "",
        },
        mode: "onBlur",
    });

    // Check for register and session expired parameters on mount
    useEffect(() => {
        const registerParam = searchParams.get('register');
        if (registerParam === 'true') {
            setIsRegister(true);
        }
        const sessionExpired = searchParams.get('sessionExpired');
        if (sessionExpired === 'true') {
            setError(t("authError"));
        }
    }, [searchParams, t]);

    // Redirect authenticated users, checking for pending invite token
    useEffect(() => {
        if (!isAuthenticated || hasRedirected.current) return;
        hasRedirected.current = true;

        let redirectTo = "/";
        const raw = localStorage.getItem("pendingInviteToken");
        if (raw) {
            localStorage.removeItem("pendingInviteToken");
            try {
                const parsed = JSON.parse(raw);
                if (parsed.token && Date.now() - parsed.ts < 5 * 60 * 1000) {
                    redirectTo = `/join/${parsed.token}`;
                }
            } catch { /* ignore malformed */ }
        }
        router.push(redirectTo);
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

    const toggleLocale = () => {
        const next: Locale = locale === "en" ? "ru" : "en";
        setLocale(next);
    };

    const parseBackendError = (err: unknown): string => {
        if (err instanceof AxiosError && err.response?.data) {
            const data = err.response.data;

            if (data.errors && Array.isArray(data.errors)) {
                let hasFieldErrors = false;
                for (const validationError of data.errors) {
                    const field = validationError.field?.toLowerCase();
                    const message = validationError.message;

                    if (field === "username") {
                        form.setError("username", {message});
                        hasFieldErrors = true;
                    } else if (field === "password") {
                        form.setError("password", {message});
                        hasFieldErrors = true;
                    } else if (field === "displayname") {
                        form.setError("displayName", {message});
                        hasFieldErrors = true;
                    }
                }
                if (hasFieldErrors) return t("fixValidationErrors");
            } else if (data.message) {
                return data.message;
            }
        }
        return isRegister ? t("registrationFailed") : t("loginFailed");
    };

    const onSubmit = async (values: FormValues) => {
        setError("");
        setLoading(true);

        try {
            if (isRegister) {
                await register(values.username, values.password, values.displayName || values.username);
            } else {
                await login(values.username, values.password);
            }
            // Auth state updated → re-render → guard handles redirect
            // (including pending invite token check)
        } catch (err) {
            setError(parseBackendError(err));
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
                        {isRegister ? t("createAccount") : t("signInDesc")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <Controller
                                control={form.control}
                                name="username"
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid || undefined}>
                                        <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5"/>
                                            {t("username")}
                                        </FieldLabel>
                                        <Input {...field} id={field.name} autoFocus aria-invalid={fieldState.invalid}/>
                                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                    </Field>
                                )}
                            />

                            <Controller
                                control={form.control}
                                name="password"
                                render={({field, fieldState}) => (
                                    <Field data-invalid={fieldState.invalid || undefined}>
                                        <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                            <Lock className="h-3.5 w-3.5"/>
                                            {t("password")}
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupInput
                                                {...field}
                                                id={field.name}
                                                type={showPassword ? "text" : "password"}
                                                aria-invalid={fieldState.invalid}
                                            />
                                            <InputGroupAddon align="inline-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4"/>
                                                    ) : (
                                                        <Eye className="h-4 w-4"/>
                                                    )}
                                                </Button>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                    </Field>
                                )}
                            />

                            {isRegister && (
                                <Controller
                                    control={form.control}
                                    name="displayName"
                                    render={({field, fieldState}) => (
                                        <Field data-invalid={fieldState.invalid || undefined}>
                                            <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5">
                                                <UserPlus className="h-3.5 w-3.5"/>
                                                {t("displayName")}
                                            </FieldLabel>
                                            <Input {...field} id={field.name} placeholder={t("displayNamePlaceholder")} aria-invalid={fieldState.invalid}/>
                                            {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                                        </Field>
                                    )}
                                />
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
                                        form.reset();
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
