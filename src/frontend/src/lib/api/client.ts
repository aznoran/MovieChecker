import axios from "axios";
import { getSession, signIn } from "next-auth/react";
import { QueryClient } from "@tanstack/react-query";
import { Api } from "./moviechecker-generated";
import { Api as SearchApi } from "./search-generated";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const SEARCH_API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL || "http://localhost:5100";

// Shared QueryClient — imported by providers.tsx
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
        },
    },
});

// Create API instance
export const apiClient = new Api({
    baseURL: API_URL,
    secure: true,
});

// Deduplicate concurrent getSession() calls (e.g. multiple queries on page reload)
let _sessionPromise: Promise<Awaited<ReturnType<typeof getSession>>> | null = null;

function getSessionCached() {
    if (!_sessionPromise) {
        _sessionPromise = getSession().then((session) => {
            if (!session) {
                // Don't cache null - allow immediate retry
                setTimeout(() => { _sessionPromise = null; }, 0);
            } else {
                setTimeout(() => { _sessionPromise = null; }, 2000);
            }
            return session;
        });
    }
    return _sessionPromise;
}

// Request interceptor: attach Bearer token from session
apiClient.instance.interceptors.request.use(async (config) => {
    if (typeof window !== "undefined") {
        const session = await getSessionCached();

        if (session?.error === "RefreshTokenError") {
            signIn("authentik");
            return Promise.reject(new axios.Cancel("Session expired, redirecting to login"));
        }

        if (session?.accessToken) {
            config.headers.Authorization = `Bearer ${session.accessToken}`;
        } else {
            return Promise.reject(new axios.Cancel("No auth session available"));
        }

        const locale = localStorage.getItem("locale") || "en";
        config.headers["Accept-Language"] = locale;
    }
    return config;
});

// 401 handler — trigger re-authentication
apiClient.instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        const isAuthRequest = error.config?.url?.includes("/auth/");
        if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthRequest) {
            signIn("authentik");
        }
        return Promise.reject(error);
    }
);

// ContentSearch API instance (no auth needed)
export const searchApiClient = new SearchApi({
    baseURL: SEARCH_API_URL,
});

export const getPosterUrl = (posterIdOrPath: string | undefined | null): string | null => {
    if (!posterIdOrPath) return null;
    if (posterIdOrPath.startsWith("http")) return posterIdOrPath;
    const base = API_URL;
    if (/^\d+$/.test(posterIdOrPath)) {
        return `${base}/api/posters/${posterIdOrPath}`;
    }
    return `${base}${posterIdOrPath}`;
};
