"use client"

import {useState} from "react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {checkInviteCode} from "@/lib/api";
import {AxiosError} from "axios";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldGroup,
} from "@/components/ui/field";
import {InputOTP, InputOTPGroup, InputOTPSlot} from "@/components/ui/input-otp";
import {cn} from "@/lib/utils";
import {UserPlus, Lock, KeyRound} from "lucide-react";
import {toast} from "sonner";

interface JoinGroupFormProps {
    setError: (error: string) => void;
}

export function JoinGroupForm({setError}: JoinGroupFormProps) {
    const {t} = useLocale();
    const {joinGroup} = useGroup();

    const [joinCode, setJoinCode] = useState("");
    const [joinPassword, setJoinPassword] = useState("");
    const [joinOtp, setJoinOtp] = useState("");
    const [useOtpMode, setUseOtpMode] = useState(false);
    const [joinStep, setJoinStep] = useState<"code" | "auth">("code");
    const [groupToJoin, setGroupToJoin] = useState<{
        name: string;
        isPrivate: boolean;
        hasPassword: boolean;
    } | null>(null);

    const getErrorMessage = (err: unknown): string | undefined => {
        return err instanceof AxiosError ? err.response?.data?.message : undefined;
    };

    const handleCheckInviteCode = async () => {
        if (!joinCode.trim()) {
            toast.error(t("joinCodeRequired"), { position: "top-center" });
            return;
        }
        try {
            setError("");
            const result = await checkInviteCode(joinCode.trim());

            if (!result.exists) {
                setError(t("invalidCode"));
                return;
            }

            if (!result.isPrivate) {
                await joinGroup(joinCode.trim());
                setJoinCode("");
                setJoinStep("code");
                setGroupToJoin(null);
                return;
            }

            setGroupToJoin({
                name: result.groupName || "",
                isPrivate: result.isPrivate,
                hasPassword: result.hasPassword,
            });

            setUseOtpMode(!result.hasPassword);
            setJoinStep("auth");
        } catch (err) {
            setError(getErrorMessage(err) || t("invalidCode"));
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;
        try {
            await joinGroup(joinCode.trim(), joinPassword || undefined, joinOtp || undefined);
            setJoinCode("");
            setJoinPassword("");
            setJoinOtp("");
            setUseOtpMode(false);
            setError("");
            setJoinStep("code");
            setGroupToJoin(null);
        } catch (err) {
            setError(getErrorMessage(err) || t("joinError"));
        }
    };

    const handleBackToCode = () => {
        setJoinStep("code");
        setGroupToJoin(null);
        setJoinPassword("");
        setJoinOtp("");
        setUseOtpMode(false);
        setError("");
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/90">
                {t("joinGroup")}
            </h3>
            <FieldGroup className="gap-4">
                {joinStep === "code" ? (
                    <>
                        <Field>
                            <FieldLabel htmlFor="joinCode" className="text-sm font-medium">
                                {t("enterInviteCode")}
                            </FieldLabel>
                            <Input
                                id="joinCode"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder={t("enterInviteCode")}
                                className="h-10 font-mono bg-background border-border/60 focus-visible:ring-primary/20"
                                onKeyDown={(e) => e.key === "Enter" && handleCheckInviteCode()}
                            />
                        </Field>

                        <Button
                            size="sm"
                            className="w-full h-10 bg-primary hover:bg-primary/90 shadow-sm"
                            onClick={handleCheckInviteCode}
                        >
                            <UserPlus className="h-4 w-4 mr-2"/>
                            {t("continue")}
                        </Button>
                    </>
                ) : (
                    <>
                        <div
                            className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-primary"/>
                                <span className="font-medium">{groupToJoin?.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {groupToJoin?.hasPassword
                                    ? t("privateGroupWithPassword")
                                    : t("privateGroupOtpOnly")}
                            </p>
                        </div>

                        {groupToJoin?.hasPassword && (
                            <Field>
                                <FieldLabel className="text-sm font-medium mb-2">
                                    {t("authenticationMethod")}
                                </FieldLabel>
                                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                                    <Button
                                        variant={!useOtpMode ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-9 flex-1 transition-all",
                                            !useOtpMode && "shadow-sm"
                                        )}
                                        onClick={() => setUseOtpMode(false)}
                                    >
                                        <Lock className="h-3.5 w-3.5 mr-2"/>
                                        {t("password")}
                                    </Button>
                                    <Button
                                        variant={useOtpMode ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "h-9 flex-1 transition-all",
                                            useOtpMode && "shadow-sm"
                                        )}
                                        onClick={() => setUseOtpMode(true)}
                                    >
                                        <KeyRound className="h-3.5 w-3.5 mr-2"/>
                                        {t("otp")}
                                    </Button>
                                </div>
                            </Field>
                        )}

                        {!useOtpMode && groupToJoin?.hasPassword ? (
                            <Field>
                                <FieldLabel htmlFor="joinPassword" className="text-sm font-medium">
                                    {t("password")}
                                </FieldLabel>
                                <Input
                                    id="joinPassword"
                                    type="password"
                                    value={joinPassword}
                                    onChange={(e) => setJoinPassword(e.target.value)}
                                    placeholder={t("enterPassword")}
                                    className="h-10 bg-background border-border/60 focus-visible:ring-primary/20"
                                    onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                                />
                            </Field>
                        ) : (
                            <Field>
                                <FieldLabel className="text-sm font-medium">
                                    {t("enterOtp")}
                                </FieldLabel>
                                <div
                                    className="flex justify-center bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/40">
                                    <InputOTP
                                        maxLength={6}
                                        value={joinOtp}
                                        onChange={(value) => setJoinOtp(value)}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0}/>
                                            <InputOTPSlot index={1}/>
                                            <InputOTPSlot index={2}/>
                                            <InputOTPSlot index={3}/>
                                            <InputOTPSlot index={4}/>
                                            <InputOTPSlot index={5}/>
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                                <FieldDescription className="text-center text-xs">
                                    {t("enterSixDigitCode")}
                                </FieldDescription>
                            </Field>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10"
                                onClick={handleBackToCode}
                            >
                                {t("back")}
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 h-10 bg-primary hover:bg-primary/90 shadow-sm"
                                onClick={handleJoinGroup}
                            >
                                <UserPlus className="h-4 w-4 mr-2"/>
                                {t("joinGroup")}
                            </Button>
                        </div>
                    </>
                )}
            </FieldGroup>
        </div>
    );
}
