import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { WatchStatus, WatchEntryDto, StatsDto, CreateWatchEntryRequest, UpdateWatchEntryRequest } from "@/lib/api";
import { queryKeys, mutationKeys } from "./keys";

export function useWatchEntries(status?: WatchStatus, groupId?: number, options?: Omit<UseQueryOptions<WatchEntryDto[]>, "queryKey" | "queryFn">) {
    return useQuery({
        queryKey: queryKeys.watchEntries(status, groupId),
        queryFn: async () => {
            const query: { status?: WatchStatus; groupId?: number } = {};
            if (status !== undefined) query.status = status;
            if (groupId !== undefined) query.groupId = groupId;
            return (await apiClient.api.watchEntriesList(query)).data;
        },
        ...options,
    });
}

export function useStats(groupId?: number, options?: Omit<UseQueryOptions<StatsDto>, "queryKey" | "queryFn">) {
    return useQuery({
        queryKey: queryKeys.stats(groupId),
        queryFn: async () =>
            (await apiClient.api.watchEntriesStatsList(groupId !== undefined ? { groupId } : undefined)).data,
        ...options,
    });
}

export function useCreateWatchEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.createWatchEntry(),
        mutationFn: async (data: CreateWatchEntryRequest) =>
            (await apiClient.api.watchEntriesCreate(data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useUpdateWatchEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.updateWatchEntry(),
        mutationFn: async ({ id, data }: { id: number; data: UpdateWatchEntryRequest }) =>
            (await apiClient.api.watchEntriesUpdate(id, data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useArchivedEntries(groupId?: number, options?: Omit<UseQueryOptions<WatchEntryDto[]>, "queryKey" | "queryFn">) {
    return useQuery({
        queryKey: queryKeys.archivedEntries(groupId),
        queryFn: async () => {
            const query: { groupId?: number } = {};
            if (groupId !== undefined) query.groupId = groupId;
            return (await apiClient.api.watchEntriesArchivedList(query)).data;
        },
        ...options,
    });
}

export function useDeleteWatchEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.deleteWatchEntry(),
        mutationFn: (id: number) => apiClient.api.watchEntriesDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["archivedEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useRestoreWatchEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.restoreWatchEntry(),
        mutationFn: async (id: number) =>
            (await apiClient.api.watchEntriesRestoreCreate(id)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["archivedEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}

export function useRateEntry() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: mutationKeys.rateEntry(),
        mutationFn: ({ id, rating, targetUserId }: { id: number; rating: number; targetUserId?: string }) =>
            apiClient.api.watchEntriesRateCreate(id, { rating, targetUserId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchEntries"] });
            queryClient.invalidateQueries({ queryKey: ["stats"] });
        },
    });
}
