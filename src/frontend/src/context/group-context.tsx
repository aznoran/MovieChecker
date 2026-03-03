"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
    useMyGroups,
    useCreateGroup as useCreateGroupMutation,
    useJoinGroup as useJoinGroupMutation,
    useLeaveGroup as useLeaveGroupMutation,
    useKickMember as useKickMemberMutation,
    useTransferOwnership as useTransferOwnershipMutation,
    useUpdateMemberRole as useUpdateMemberRoleMutation,
    useGenerateOtp as useGenerateOtpMutation,
    useUpdateGroupSettings as useUpdateGroupSettingsMutation,
} from "@/hooks/api";
import type { GroupDto } from "@/lib/api/generated";
import { GroupType, GroupRole } from "@/lib/api/generated";
import {toast} from "sonner";
import {useLocale} from "@/context/locale-context";

interface GroupContextValue {
    groups: GroupDto[];
    personalGroup: GroupDto | undefined;
    activeGroupId: number | undefined;
    activeGroup: GroupDto | undefined;
    setActiveGroupId: (id: number | undefined) => void;
    createGroup: (name: string, isPrivate?: boolean, defaultRole?: GroupRole) => Promise<GroupDto>;
    joinGroup: (code: string, otp?: string, inviteLinkToken?: string) => Promise<GroupDto>;
    leaveGroup: (id: number) => Promise<void>;
    kickMember: (groupId: number, userId: string) => Promise<void>;
    transferOwnership: (groupId: number, newOwnerId: string) => Promise<void>;
    updateMemberRole: (groupId: number, userId: string, role: GroupRole) => Promise<void>;
    generateOtp: (groupId: number) => Promise<{ code: string; expiresAt: string }>;
    updateGroupSettings: (groupId: number, settings: { name?: string; isPrivate?: boolean; defaultRole?: GroupRole }) => Promise<GroupDto>;
    isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({children}: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const {t} = useLocale();

    const [rawActiveGroupId, setRawActiveGroupIdState] = useState<number | undefined>(() => {
        if (typeof window === "undefined") return undefined;
        const stored = localStorage.getItem("activeGroupId");
        return stored ? parseInt(stored) : undefined;
    });

    const {data: groups = [], isLoading} = useMyGroups({ enabled: !!session });

    const setActiveGroupId = useCallback((id: number | undefined) => {
        setRawActiveGroupIdState(id);
        if (typeof window !== "undefined") {
            if (id !== undefined) {
                localStorage.setItem("activeGroupId", id.toString());
            } else {
                localStorage.removeItem("activeGroupId");
            }
        }
        // Invalidate data queries so they refetch for the new group
        queryClient.invalidateQueries({queryKey: ["watchEntries"]});
        queryClient.invalidateQueries({queryKey: ["stats"]});
        queryClient.invalidateQueries({queryKey: ["permissions"]});
    }, [queryClient]);

    // Track previous auth state to detect actual logout (not initial loading state)
    const wasAuthenticatedRef = useRef(false);

    // Reset on logout: clear active group and all cached query data
    useEffect(() => {
        if (session) {
            wasAuthenticatedRef.current = true;
        } else if (status === "unauthenticated" && wasAuthenticatedRef.current) {
            // Only clear when transitioning from authenticated to unauthenticated (actual logout)
            wasAuthenticatedRef.current = false;
            setActiveGroupId(undefined);
            queryClient.clear();
        }
    }, [session, status, setActiveGroupId, queryClient]);

    const personalGroup = useMemo(() => groups.find((g) => g.groupType === GroupType.Personal), [groups]);

    // Derive activeGroupId: undefined until groups are loaded, then validate against actual groups
    const activeGroupId = useMemo(() => {
        if (!session || isLoading) return undefined;
        if (rawActiveGroupId !== undefined && groups.find((g) => g.id === rawActiveGroupId)) {
            return rawActiveGroupId;
        }
        return personalGroup?.id;
    }, [rawActiveGroupId, session, isLoading, groups, personalGroup]);

    // Clean up stale localStorage when stored group ID is no longer valid
    useEffect(() => {
        if (!isLoading && groups.length > 0 && rawActiveGroupId !== undefined) {
            if (!groups.find((g) => g.id === rawActiveGroupId)) {
                setActiveGroupId(personalGroup?.id);
            }
        }
    }, [isLoading, groups, rawActiveGroupId, personalGroup, setActiveGroupId]);

    const activeGroup = groups.find((g) => g.id === activeGroupId);

    const createMutation = useCreateGroupMutation();
    const joinMutation = useJoinGroupMutation();
    const leaveMutation = useLeaveGroupMutation();
    const kickMutation = useKickMemberMutation();
    const transferMutation = useTransferOwnershipMutation();
    const updateRoleMutation = useUpdateMemberRoleMutation();
    const generateOtpMutation = useGenerateOtpMutation();
    const updateSettingsMutation = useUpdateGroupSettingsMutation();

    return (
        <GroupContext.Provider
            value={{
                groups,
                personalGroup,
                activeGroupId,
                activeGroup,
                setActiveGroupId,
                createGroup: async (name, isPrivate, defaultRole) => {
                    const group = await createMutation.mutateAsync({ name, isPrivate, defaultRole });
                    toast.success(t("groupCreateSuccess"), { position: "top-center" });
                    setActiveGroupId(group.id);
                    return group;
                },
                joinGroup: async (code, otp, inviteLinkToken) => {
                    try {
                        const group = await joinMutation.mutateAsync({ inviteCode: code, otp, inviteLinkToken });
                        toast.success(t("joinSuccess"), { position: "top-center" });
                        setActiveGroupId(group.id);
                        return group;
                    } catch (err) {
                        toast.error(t("joinError"), { position: "top-center" });
                        throw err;
                    }
                },
                leaveGroup: async (id) => {
                    await leaveMutation.mutateAsync(id);
                    toast.success(t("leaveSuccess"), { position: "top-center" });
                    setActiveGroupId(undefined);
                },
                kickMember: async (groupId, userId) => {
                    await kickMutation.mutateAsync({ groupId, userId });
                    toast.success(t("kickSuccess"), { position: "top-center" });
                },
                transferOwnership: async (groupId, newOwnerId) => {
                    await transferMutation.mutateAsync({ groupId, newOwnerId });
                    toast.success(t("transferSuccess"), { position: "top-center" });
                },
                updateMemberRole: async (groupId, userId, role) => {
                    await updateRoleMutation.mutateAsync({ groupId, userId, role });
                    toast.success(t("roleUpdateSuccess"), { position: "top-center" });
                },
                generateOtp: (groupId) => generateOtpMutation.mutateAsync(groupId),
                updateGroupSettings: async (groupId, settings) => {
                    const group = await updateSettingsMutation.mutateAsync({ groupId, settings });
                    toast.success(t("groupSettingsUpdated"), { position: "top-center" });
                    return group;
                },
                isLoading,
            }}
        >
            {children}
        </GroupContext.Provider>
    );
}

export function useGroup() {
    const ctx = useContext(GroupContext);
    if (!ctx) throw new Error("useGroup must be used within GroupProvider");
    return ctx;
}
