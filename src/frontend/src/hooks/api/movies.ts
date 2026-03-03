import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { CreateMovieRequest, UpdateMovieRequest } from "@/lib/api";
import { mutationKeys } from "./keys";

export function useCreateMovie() {
    return useMutation({
        mutationKey: mutationKeys.createMovie(),
        mutationFn: async (data: CreateMovieRequest) =>
            (await apiClient.api.moviesCreate(data)).data,
    });
}

export function useUpdateMovie() {
    return useMutation({
        mutationKey: mutationKeys.updateMovie(),
        mutationFn: async ({ id, data }: { id: number; data: UpdateMovieRequest }) =>
            (await apiClient.api.moviesUpdate(id, data)).data,
    });
}
