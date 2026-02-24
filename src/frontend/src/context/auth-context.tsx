"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import type {UserDto} from "@/lib/api/generated";
import {  } from "@/lib/api/generated";
import { setToken as apiSetToken, register } from "@/lib/api/client";

interface AuthContextType {
    user: UserDto | null;
    token: string | null;
    refreshToken: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string | null;
    expiresIn: number;
    tokenType: string;
    user: UserDto;
}

interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Token refresh timer
let refreshTimer: NodeJS.Timeout | null = null;

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<UserDto | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Refresh token before it expires
    const scheduleTokenRefresh = useCallback((expiresIn: number) => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }

        // Refresh 1 minute before expiry
        const refreshTime = (expiresIn - 60) * 1000;
        if (refreshTime > 0) {
            refreshTimer = setTimeout(async () => {
                await refreshAccessToken();
            }, refreshTime);
        }
    }, []);

    const refreshAccessToken = useCallback(async () => {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (!storedRefreshToken) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const response = await fetch(`${apiUrl}/api/auth/refresh`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({refreshToken: storedRefreshToken}),
            });

            if (response.ok) {
                const data: RefreshResponse = await response.json();

                setToken(data.accessToken);
                setRefreshToken(data.refreshToken);
                localStorage.setItem("token", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                localStorage.setItem("tokenExpiry", (Date.now() + data.expiresIn * 1000).toString());

                // Update API client token
                apiSetToken(data.accessToken);

                // Schedule next refresh
                scheduleTokenRefresh(data.expiresIn);
            } else {
                // Refresh failed, logout user
                logout();
            }
        } catch (error) {
            console.error("Token refresh failed:", error);
            logout();
        }
    }, [scheduleTokenRefresh]);

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedToken = localStorage.getItem("token");
                const storedRefreshToken = localStorage.getItem("refreshToken");
                const storedUser = localStorage.getItem("user");
                const tokenExpiry = localStorage.getItem("tokenExpiry");

                if (storedToken && storedUser) {
                    // Check if token is still valid
                    if (tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
                        setToken(storedToken);
                        setRefreshToken(storedRefreshToken);
                        setUser(JSON.parse(storedUser));
                        apiSetToken(storedToken);

                        // Schedule refresh
                        const expiresIn = Math.floor((parseInt(tokenExpiry) - Date.now()) / 1000);
                        scheduleTokenRefresh(expiresIn);
                    } else if (storedRefreshToken) {
                        // Token expired, try to refresh
                        await refreshAccessToken();
                    } else {
                        // No valid session
                        localStorage.clear();
                    }
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
                localStorage.clear();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, [refreshAccessToken, scheduleTokenRefresh]);

    const login = async (username: string, password: string) => {
        setError(null);
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({username, password}),
            });

            if (response.ok) {
                const data: LoginResponse = await response.json();

                setToken(data.accessToken);
                setRefreshToken(data.refreshToken);
                setUser(data.user);

                localStorage.setItem("token", data.accessToken);
                if (data.refreshToken) {
                    localStorage.setItem("refreshToken", data.refreshToken);
                }
                localStorage.setItem("user", JSON.stringify(data.user));
                localStorage.setItem("tokenExpiry", (Date.now() + data.expiresIn * 1000).toString());

                // Update API client token
                apiSetToken(data.accessToken);

                // Schedule token refresh
                scheduleTokenRefresh(data.expiresIn);
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.message || errorData.error || "Login failed";
                setError(errorMessage);
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("Login failed:", error);
            setError(error instanceof Error ? error.message : "Login failed");
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, password: string, displayName: string) => {
        setError(null);
        setIsLoading(true);

        try {
            // Use the generated API client to register the user
            await apiClient.auth.authRegisterCreate({
                username,
                password,
                displayName: displayName || username
            });

            // Registration successful, user needs to login
            setError(null);
        } catch (error) {
            console.error("Registration failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Registration failed";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        // Clear refresh timer
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const storedToken = localStorage.getItem("token");

            if (storedToken) {
                // Call logout endpoint to clear server-side session
                await fetch(`${apiUrl}/api/auth/logout`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Clear local state
            setToken(null);
            setRefreshToken(null);
            setUser(null);
            setError(null);

            // Clear localStorage
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            localStorage.removeItem("tokenExpiry");
            localStorage.removeItem("activeGroupId");
            localStorage.setItem("wasLoggedIn", new Date().toISOString());

            // Clear API client token
            apiClient.setToken(null);

            // Redirect to login page
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                refreshToken,
                login,
                register,
                logout,
                isAuthenticated: !!token,
                isLoading,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}