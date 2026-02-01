"use client"

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/context/auth-context";
import {useLocale} from "@/context/locale-context";
import {getUserSettings, updateUserSettings} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Field, FieldLabel, FieldDescription, FieldSeparator} from "@/components/ui/field";
import {Switch} from "@/components/ui/switch";
import {ArrowLeft} from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const {isAuthenticated} = useAuth();
    const {t} = useLocale();
    const [preventOthersAdding, setPreventOthersAdding] = useState(false);
    const [preventMeAdding, setPreventMeAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        const loadSettings = async () => {
            try {
                const settings = await getUserSettings();
                setPreventOthersAdding(settings.preventOthersAddingToMyPersonal);
                setPreventMeAdding(settings.preventMeAddingToMyPersonal);
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [isAuthenticated, router]);

    const handleToggleOthers = async (checked: boolean) => {
        setSaving(true);
        try {
            const settings = await updateUserSettings({
                preventOthersAddingToMyPersonal: checked
            });
            setPreventOthersAdding(settings.preventOthersAddingToMyPersonal);
            setPreventMeAdding(settings.preventMeAddingToMyPersonal);
        } catch (error) {
            console.error("Failed to update settings:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleMe = async (checked: boolean) => {
        setSaving(true);
        try {
            const settings = await updateUserSettings({
                preventMeAddingToMyPersonal: checked
            });
            setPreventOthersAdding(settings.preventOthersAddingToMyPersonal);
            setPreventMeAdding(settings.preventMeAddingToMyPersonal);
        } catch (error) {
            console.error("Failed to update settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">{t("loading")}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/")}
                    className="mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    {t("back")}
                </Button>
                <h1 className="text-3xl font-bold">{t("settings")}</h1>
            </div>

            <div className="space-y-6">
                <div className="rounded-lg border p-6">
                    <h2 className="text-xl font-semibold mb-4">{t("privacy")}</h2>

                    <Field>
                        <div className="flex items-center justify-between gap-24">
                            <div className="space-y-0.5">
                                <FieldLabel>{t("preventOthersAddingToMyPersonal")}</FieldLabel>
                                <FieldDescription>
                                    {t("preventOthersAddingToMyPersonalDescription")}
                                </FieldDescription>
                            </div>
                            <Switch
                                checked={preventOthersAdding}
                                onCheckedChange={handleToggleOthers}
                                disabled={saving}
                            />
                        </div>
                    </Field>

                    <FieldSeparator className="p-8"/>

                    <Field>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <FieldLabel>{t("preventMeAddingToMyPersonal")}</FieldLabel>
                                <FieldDescription>
                                    {t("preventMeAddingToMyPersonalDescription")}
                                </FieldDescription>
                            </div>
                            <Switch
                                checked={preventMeAdding}
                                onCheckedChange={handleToggleMe}
                                disabled={saving}
                            />
                        </div>
                    </Field>
                </div>
            </div>
        </div>
    );
}
