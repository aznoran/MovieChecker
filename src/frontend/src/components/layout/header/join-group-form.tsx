"use client"

import {useState} from "react";
import {useLocale} from "@/context/locale-context";
import {useGroup} from "@/context/group-context";
import {useCheckInviteCode} from "@/hooks/api";
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
import {UserPlus, Lock} from "lucide-react";
import {toast} from "sonner";

interface JoinGroupFormProps {
    setError: (error: string) => void;
}

export function JoinGroupForm({setError}: JoinGroupFormProps) {
    const {t} = useLocale();
    const {joinGroup} = useGroup();
    const checkInviteMutation = useCheckInviteCode();

    const [joinCode, setJoinCode] = useState("");
    const [joinOtp, setJoinOtp] = useState("");
    const [joinStep, setJoinStep] = useState<"code" | "auth">("code");
    const [groupToJoin, setGroupToJoin] = useState<{
        name: string;
        isPrivate: boolean;
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
            const result = await checkInviteMutation.mutateAsync(joinCode.trim());

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
            });

            setJoinStep("auth");
        } catch (err) {
            setError(getErrorMessage(err) || t("invalidCode"));
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim()) return;
        try {
            await joinGroup(joinCode.trim(), joinOtp || undefined);
            setJoinCode("");
            setJoinOtp("");
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
        setJoinOtp("");
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
                                {t("privateGroupOtpOnly")}
                            </p>
                        </div>

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
