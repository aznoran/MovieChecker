"use client";

import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import {
    Field,
    FieldLabel,
    FieldDescription,
    FieldContent,
} from "@/components/ui/field";
import { useLocale } from "@/context/locale-context";

interface GroupMember {
    userId?: number;
    displayName?: string | null;
}

interface MemberSelectProps {
    members: GroupMember[];
    selectedMembers: number[];
    onToggleMember: (userId: number) => void;
    disabled?: boolean;
}

export function MemberSelect({
    members,
    selectedMembers,
    onToggleMember,
    disabled,
}: MemberSelectProps) {
    const { t } = useLocale();

    return (
        <Field>
            <FieldContent>
                <FieldLabel className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {t("viewers")}
                </FieldLabel>
                <FieldDescription>
                    {t("membersDescription")}
                </FieldDescription>
            </FieldContent>
            <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                    const selected = selectedMembers.includes(m.userId!);
                    return (
                        <Button
                            key={m.userId}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            disabled={disabled}
                            onClick={() => onToggleMember(m.userId!)}
                        >
                            {m.displayName}
                        </Button>
                    );
                })}
            </div>
        </Field>
    );
}
