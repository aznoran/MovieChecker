import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { mutationKeys } from "./keys";

export function useUploadPoster() {
    return useMutation({
        mutationKey: mutationKeys.uploadPoster(),
        mutationFn: async (file: File) => {
            const res = await apiClient.api.uploadPosterCreate({ file });
            return (res.data.id || 0).toString();
        },
    });
}
