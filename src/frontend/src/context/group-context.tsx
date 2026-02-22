"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import {
    getMyGroups,
    createGroup as apiCreateGroup,
    joinGroup as apiJoinGroup,
    leaveGroup as apiLeaveGroup,
    kickMember as apiKickMember,
    transferOwnership as apiTransferOwnership,
    updateMemberRole as apiUpdateMemberRole,
    generateOtp as apiGenerateOtp,
    updateGroupPassword as apiUpdateGroupPassword,
    updateGroupSettings as apiUpdateGroupSettings,
} from "@/lib/api";
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
    createGroup: (name: string, isPrivate?: boolean, password?: string, defaultRole?: GroupRole) => Promise<GroupDto>;
    joinGroup: (code: string, password?: string, otp?: string, inviteLinkToken?: string) => Promise<GroupDto>;
    leaveGroup: (id: number) => Promise<void>;
    kickMember: (groupId: number, userId: number) => Promise<void>;
    transferOwnership: (groupId: number, newOwnerId: number) => Promise<void>;
    updateMemberRole: (groupId: number, userId: number, role: GroupRole) => Promise<void>;
    generateOtp: (groupId: number) => Promise<{ code: string; expiresAt: string }>;
    updatePassword: (groupId: number, newPassword?: string) => Promise<void>;
    updateGroupSettings: (groupId: number, settings: { name?: string; isPrivate?: boolean }) => Promise<GroupDto>;
    isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({children}: { children: React.ReactNode }) {
    const {isAuthenticated} = useAuth();
    const queryClient = useQueryClient();
    const {t} = useLocale();

    const [rawActiveGroupId, setRawActiveGroupIdState] = useState<number | undefined>(() => {
        if (typeof window === "undefined") return undefined;
        const stored = localStorage.getItem("activeGroupId");
        return stored ? parseInt(stored) : undefined;
    });

    const {data: groups = [], isLoading} = useQuery({
        queryKey: ["groups"],
        queryFn: getMyGroups,
        enabled: isAuthenticated,
    });

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

    // Track previous auth state to detect actual logout (not initial false state)
    const wasAuthenticatedRef = useRef(false);

    // Reset on logout: clear active group and all cached query data
    useEffect(() => {
        if (isAuthenticated) {
            wasAuthenticatedRef.current = true;
        } else if (wasAuthenticatedRef.current) {
            // Only clear when transitioning from authenticated to not authenticated (actual logout)
            wasAuthenticatedRef.current = false;
            setActiveGroupId(undefined);
            queryClient.clear();
        }
    }, [isAuthenticated, setActiveGroupId, queryClient]);

    const personalGroup = useMemo(() => groups.find((g) => g.groupType === GroupType.Personal), [groups]);

    // Derive activeGroupId: use raw value if valid, otherwise fall back to personal group
    const activeGroupId = useMemo(() => {
        if (!isAuthenticated || isLoading) return rawActiveGroupId;
        if (rawActiveGroupId !== undefined && groups.find((g) => g.id === rawActiveGroupId)) {
            return rawActiveGroupId;
        }
        return personalGroup?.id;
    }, [rawActiveGroupId, isAuthenticated, isLoading, groups, personalGroup]);

    const activeGroup = groups.find((g) => g.id === activeGroupId);

    const createMutation = useMutation({
        mutationFn: ({ name, isPrivate, password, defaultRole }: { name: string, isPrivate?: boolean, password?: string, defaultRole?: GroupRole }) =>
            apiCreateGroup(name, isPrivate, password, defaultRole),
        onSuccess: async (group) => {
            toast.success(t("groupCreateSuccess"), { position: "top-center" });
            await queryClient.invalidateQueries({queryKey: ["groups"]});
            setActiveGroupId(group.id);
        },
        onError: () => {
            toast.error(t("groupCreateError"), { position: "top-center" });
        }
    });

    const joinMutation = useMutation({
        mutationFn: ({ code, password, otp, inviteLinkToken }: { code: string, password?: string, otp?: string, inviteLinkToken?: string }) =>
            apiJoinGroup(code, password, otp, inviteLinkToken),
        onSuccess: async (group) => {
            toast.success(t("joinSuccess"), { position: "top-center" })
            await queryClient.invalidateQueries({queryKey: ["groups"]});
            setActiveGroupId(group.id);
        },
        onError: () => {
            toast.error(t("joinError"), { position: "top-center" })
        }
    });

    const leaveMutation = useMutation({
        mutationFn: apiLeaveGroup,
        onSuccess: () => {
            toast.success(t("leaveSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
            setActiveGroupId(undefined);
        },
        onError: () => {
            toast.error(t("leaveError"), { position: "top-center" })
        }
    });

    const kickMutation = useMutation({
        mutationFn: ({groupId, userId}: { groupId: number; userId: number }) =>
            apiKickMember(groupId, userId),
        onSuccess: () => {
            toast.success(t("kickSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("kickError"), { position: "top-center" })
        }
    });

    const transferMutation = useMutation({
        mutationFn: ({groupId, newOwnerId}: { groupId: number; newOwnerId: number }) =>
            apiTransferOwnership(groupId, newOwnerId),
        onSuccess: () => {
            toast.success(t("transferSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("transferError"), { position: "top-center" })
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({groupId, userId, role}: { groupId: number; userId: number; role: GroupRole }) =>
            apiUpdateMemberRole(groupId, userId, role),
        onSuccess: () => {
            toast.success(t("roleUpdateSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("roleUpdateError"), { position: "top-center" })
        }
    });

    const generateOtpMutation = useMutation({
        mutationFn: (groupId: number) => apiGenerateOtp(groupId),
        onError: () => {
            toast.error(t("otpGenerateError"), { position: "top-center" })
        }
    });

    const updatePasswordMutation = useMutation({
        mutationFn: ({groupId, newPassword}: { groupId: number; newPassword?: string }) =>
            apiUpdateGroupPassword(groupId, newPassword),
        onSuccess: () => {
            toast.success(t("passwordUpdateSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("passwordUpdateError"), { position: "top-center" })
        }
    });

    const updateSettingsMutation = useMutation({
        mutationFn: ({groupId, settings}: { groupId: number; settings: { name?: string; isPrivate?: boolean } }) =>
            apiUpdateGroupSettings(groupId, settings),
        onSuccess: () => {
            toast.success(t("groupSettingsUpdated"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("groupSettingsError"), { position: "top-center" })
        }
    });

    return (
        <GroupContext.Provider
            value={{
                groups,
                personalGroup,
                activeGroupId,
                activeGroup,
                setActiveGroupId,
                createGroup: (name, isPrivate, password, defaultRole) => createMutation.mutateAsync({ name, isPrivate, password, defaultRole }),
                joinGroup: (code, password, otp, inviteLinkToken) => joinMutation.mutateAsync({ code, password, otp, inviteLinkToken }),
                leaveGroup: (id) => leaveMutation.mutateAsync(id),
                kickMember: (groupId, userId) => kickMutation.mutateAsync({groupId, userId}),
                transferOwnership: (groupId, newOwnerId) => transferMutation.mutateAsync({groupId, newOwnerId}),
                updateMemberRole: (groupId, userId, role) => updateRoleMutation.mutateAsync({groupId, userId, role}),
                generateOtp: (groupId) => generateOtpMutation.mutateAsync(groupId),
                updatePassword: (groupId, newPassword) => updatePasswordMutation.mutateAsync({groupId, newPassword}),
                updateGroupSettings: (groupId, settings) => updateSettingsMutation.mutateAsync({groupId, settings}),
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
