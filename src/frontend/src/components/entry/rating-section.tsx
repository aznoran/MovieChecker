"use client";

import { Rating, RatingItem } from "@/components/ui/rating";
import { Star } from "lucide-react";
import {
    Field,
    FieldLabel,
    FieldGroup,
    FieldSet,
    FieldLegend,
} from "@/components/ui/field";
import { useLocale } from "@/context/locale-context";

interface GroupMember {
    userId?: string;
    displayName?: string | null;
}

interface RatingSectionProps {
    isGroupMode: boolean;
    members: GroupMember[];
    selectedMembers: string[];
    memberRatings: Record<string, number>;
    onMemberRatingChange: (uid: string, value: number) => void;
    myRating: number;
    onMyRatingChange: (value: number) => void;
    canRateOthers: boolean;
    canRateSelf: boolean;
    currentUserId?: string;
}

export function RatingSection({
    isGroupMode,
    members,
    selectedMembers,
    memberRatings,
    onMemberRatingChange,
    myRating,
    onMyRatingChange,
    canRateOthers,
    canRateSelf,
    currentUserId,
}: RatingSectionProps) {
    const { t } = useLocale();

    if (isGroupMode && selectedMembers.length > 0) {
        return (
            <FieldSet>
                <FieldLegend variant="label" className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5" />
                    {t("ratings")}
                </FieldLegend>
                <FieldGroup className="gap-4">
                    {selectedMembers.map((uid) => {
                        const member = members.find((m) => m.userId === uid);
                        if (!member) return null;
                        const isSelf = uid === currentUserId;
                        const canChangeRating = isSelf ? canRateSelf : canRateOthers;
                        return (
                            <Field key={uid} orientation="horizontal" className="gap-4">
                                <FieldLabel className="flex items-center gap-1.5 min-w-0 shrink-0">
                                    {member.displayName}
                                </FieldLabel>
                                <div className="flex items-center gap-4">
                                    <div className="opacity-50">
                                        {memberRatings[uid] || 0}/10
                                    </div>
                                    <Rating
                                        value={memberRatings[uid] || 0}
                                        onValueChange={canChangeRating ? (v) => onMemberRatingChange(uid, v) : undefined}
                                        max={10}
                                        step={0.5}
                                        clearable
                                        disabled={!canChangeRating}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <RatingItem key={i} />
                                        ))}
                                    </Rating>
                                </div>
                            </Field>
                        );
                    })}
                </FieldGroup>
            </FieldSet>
        );
    }

    // Personal mode: single rating
    return (
        <Field>
            <FieldLabel className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                {t("myRatingLabel")}
            </FieldLabel>
            <div className="flex items-center gap-4">
                <Rating
                    value={myRating}
                    onValueChange={onMyRatingChange}
                    max={10}
                    step={0.5}
                    clearable
                >
                    {Array.from({ length: 10 }, (_, i) => (
                        <RatingItem key={i} />
                    ))}
                </Rating>
                <div className="opacity-50">
                    {myRating}/10
                </div>
            </div>
        </Field>
    );
}
