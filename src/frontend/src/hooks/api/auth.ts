import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { mutationKeys } from "./keys";

export function useProvisionUser() {
    return useMutation({
        mutationKey: mutationKeys.provisionUser(),
        mutationFn: async () => (await apiClient.api.authProvisionCreate()).data,
    });
}

export function useSetLanguage() {
    return useMutation({
        mutationKey: mutationKeys.setLanguage(),
        mutationFn: async (language: "en" | "ru") =>
            (await apiClient.api.authLanguageCreate({ language })).data,
    });
}
