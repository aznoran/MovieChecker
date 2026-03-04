import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./keys";
import { searchApiClient } from "@/lib/api/client";

export function useExternalSearch(query: string, enabled = false, language?: string) {
    return useQuery({
        queryKey: queryKeys.externalSearch(query, language),
        queryFn: async () => {
            const { data } = await searchApiClient.api.searchList({
                q: query,
                language,
                forceExternal: false,
            });
            return data;
        },
        enabled: enabled && query.length >= 2,
        staleTime: 1000 * 60 * 5,
        retry: 1,
    });
}
