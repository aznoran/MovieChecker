import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { UpdateUserSettingsRequest } from "@/lib/api";
import { queryKeys, mutationKeys } from "./keys";

export function useUserSettings(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: queryKeys.userSettings(),
        queryFn: async () => (await apiClient.api.userSettingsList()).data,
        ...options,
    });
}

export function useUpdateUserSettings() {
    return useMutation({
        mutationKey: mutationKeys.updateUserSettings(),
        mutationFn: async (data: UpdateUserSettingsRequest) =>
            (await apiClient.api.userSettingsUpdate(data)).data,
    });
}
