import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { GroupRole, CreateInviteLinkRequest } from "@/lib/api";
import { queryKeys, mutationKeys } from "./keys";

// ── Queries ──

export function useMyGroups(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.groups(),
        queryFn: async () => (await apiClient.api.groupsList()).data,
        ...options,
    });
}

export function useMyPermissions(groupId: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.permissions(groupId),
        queryFn: async () => (await apiClient.api.groupsMyPermissionsList(groupId)).data,
        ...options,
    });
}

export function useMemberPermissions(groupId: number, userId: string, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.memberPermissions(groupId, userId),
        queryFn: async () => (await apiClient.api.groupsMembersPermissionsList(groupId, userId)).data,
        ...options,
    });
}

export function useInviteLinks(groupId: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.inviteLinks(groupId),
        queryFn: async () => (await apiClient.api.groupsInviteLinksList(groupId)).data,
        ...options,
    });
}

// ── Mutations ──

export function useCreateGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.createGroup(),
        mutationFn: async (data: { name: string; isPrivate?: boolean; defaultRole?: GroupRole }) =>
            (await apiClient.api.groupsCreate(data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useJoinGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.joinGroup(),
        mutationFn: async (data: { inviteCode: string; otp?: string; inviteLinkToken?: string }) =>
            (await apiClient.api.groupsJoinCreate(data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useLeaveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.leaveGroup(),
        mutationFn: (id: number) => apiClient.api.groupsLeaveDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useKickMember() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.kickMember(),
        mutationFn: ({ groupId, userId }: { groupId: number; userId: string }) =>
            apiClient.api.groupsMembersDelete(groupId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useTransferOwnership() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.transferOwnership(),
        mutationFn: ({ groupId, newOwnerId }: { groupId: number; newOwnerId: string }) =>
            apiClient.api.groupsTransferUpdate(groupId, { newOwnerId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useUpdateMemberRole() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.updateMemberRole(),
        mutationFn: ({ groupId, userId, role }: { groupId: number; userId: string; role: GroupRole }) =>
            apiClient.api.groupsMembersRoleUpdate(groupId, userId, { role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useGenerateOtp() {
    return useMutation({
        mutationKey: mutationKeys.generateOtp(),
        mutationFn: async (groupId: number) => {
            const res = await apiClient.api.groupsGenerateOtpCreate(groupId);
            return {
                code: res.data.code ?? "",
                expiresAt: res.data.expiresAt ?? "",
            };
        },
    });
}

export function useUpdateGroupSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.updateGroupSettings(),
        mutationFn: async ({ groupId, settings }: {
            groupId: number;
            settings: { name?: string; isPrivate?: boolean; defaultRole?: GroupRole };
        }) => (await apiClient.api.groupsSettingsUpdate(groupId, settings)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
        },
    });
}

export function useCheckInviteCode() {
    return useMutation({
        mutationKey: mutationKeys.checkInviteCode(),
        mutationFn: async (inviteCode: string) => {
            const res = await apiClient.api.groupsCheckInviteCreate({ inviteCode });
            return {
                exists: res.data.exists ?? false,
                isPrivate: res.data.isPrivate ?? false,
                groupName: res.data.groupName ?? null,
            };
        },
    });
}

export function useCreateInviteLink(groupId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.createInviteLink(),
        mutationFn: async (data?: Omit<CreateInviteLinkRequest, never>) =>
            (await apiClient.api.groupsInviteLinksCreate(groupId, data ?? {})).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks(groupId) });
        },
    });
}

export function useDeleteInviteLink(groupId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.deleteInviteLink(),
        mutationFn: (linkId: number) => apiClient.api.groupsInviteLinksDelete(groupId, linkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.inviteLinks(groupId) });
        },
    });
}

export function useUpdateMemberPermissions() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.updateMemberPermissions(),
        mutationFn: async ({ groupId, userId, granted, revoked }: {
            groupId: number;
            userId: string;
            granted: number;
            revoked: number;
        }) => (await apiClient.api.groupsMembersPermissionsUpdate(groupId, userId, {
            grantedPermissions: granted,
            revokedPermissions: revoked,
        })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
            queryClient.invalidateQueries({ queryKey: ["permissions"] });
            queryClient.invalidateQueries({ queryKey: ["memberPermissions"] });
        },
    });
}
