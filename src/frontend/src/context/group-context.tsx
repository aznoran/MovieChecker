"use client";

import {createContext, useContext, useState, useEffect, useCallback} from "react";
import {useQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuth} from "@/context/auth-context";
import {
    getMyGroups,
    createGroup as apiCreateGroup,
    joinGroup as apiJoinGroup,
    leaveGroup as apiLeaveGroup,
    kickMember as apiKickMember,
    transferOwnership as apiTransferOwnership,
    updateMemberRole as apiUpdateMemberRole,
} from "@/lib/api";
import type {Group} from "@/types";
import {toast} from "sonner";
import {useLocale} from "@/context/locale-context";

interface GroupContextValue {
    groups: Group[];
    activeGroupId: number | undefined;
    activeGroup: Group | undefined;
    setActiveGroupId: (id: number | undefined) => void;
    createGroup: (name: string, isPrivate?: boolean, password?: string) => Promise<Group>;
    joinGroup: (code: string, password?: string) => Promise<Group>;
    leaveGroup: (id: number) => Promise<void>;
    kickMember: (groupId: number, userId: number) => Promise<void>;
    transferOwnership: (groupId: number, newOwnerId: number) => Promise<void>;
    updateMemberRole: (groupId: number, userId: number, role: number) => Promise<void>;
    isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({children}: { children: React.ReactNode }) {
    const {isAuthenticated} = useAuth();
    const queryClient = useQueryClient();
    const {t} = useLocale();

    const [activeGroupId, setActiveGroupIdState] = useState<number | undefined>(() => {
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
        setActiveGroupIdState(id);
        if (typeof window !== "undefined") {
            if (id !== undefined) {
                localStorage.setItem("activeGroupId", id.toString());
            } else {
                localStorage.removeItem("activeGroupId");
            }
        }
    }, []);

    // Reset on logout: clear active group and all cached query data
    useEffect(() => {
        if (!isAuthenticated) {
            setActiveGroupId(undefined);
            queryClient.clear();
        }
    }, [isAuthenticated, setActiveGroupId, queryClient]);

    // If activeGroupId is set but not in groups list, reset to personal
    useEffect(() => {
        if (!isLoading && activeGroupId !== undefined && !groups.find((g) => g.id === activeGroupId)) {
            setActiveGroupId(undefined);
        }
    }, [groups, activeGroupId, isLoading, setActiveGroupId]);

    const activeGroup = groups.find((g) => g.id === activeGroupId);

    const createMutation = useMutation({
        mutationFn: ({ name, isPrivate, password }: { name: string, isPrivate?: boolean, password?: string }) => 
            apiCreateGroup(name, isPrivate, password),
        onSuccess: (group) => {
            toast.success(t("groupCreateSuccess"), { position: "top-center" });
            queryClient.invalidateQueries({queryKey: ["groups"]});
            setActiveGroupId(group.id);
        },
        onError: () => {
            toast.error(t("groupCreateError"), { position: "top-center" });
        }
    });

    const joinMutation = useMutation({
        mutationFn: ({ code, password }: { code: string, password?: string }) => 
            apiJoinGroup(code, password),
        onSuccess: (group) => {
            toast.success(t("joinSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
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
        mutationFn: ({groupId, userId, role}: { groupId: number; userId: number; role: number }) =>
            apiUpdateMemberRole(groupId, userId, role),
        onSuccess: () => {
            toast.success(t("roleUpdateSuccess"), { position: "top-center" })
            queryClient.invalidateQueries({queryKey: ["groups"]});
        },
        onError: () => {
            toast.error(t("roleUpdateError"), { position: "top-center" })
        }
    });

    return (
        <GroupContext.Provider
            value={{
                groups,
                activeGroupId,
                activeGroup,
                setActiveGroupId,
                createGroup: (name, isPrivate, password) => createMutation.mutateAsync({ name, isPrivate, password }),
                joinGroup: (code, password) => joinMutation.mutateAsync({ code, password }),
                leaveGroup: (id) => leaveMutation.mutateAsync(id),
                kickMember: (groupId, userId) => kickMutation.mutateAsync({groupId, userId}),
                transferOwnership: (groupId, newOwnerId) => transferMutation.mutateAsync({groupId, newOwnerId}),
                updateMemberRole: (groupId, userId, role) => updateRoleMutation.mutateAsync({groupId, userId, role}),
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
