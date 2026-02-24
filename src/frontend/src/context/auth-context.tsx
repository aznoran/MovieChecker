"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { UserDto } from "@/lib/api/generated";
import { login as apiLogin, register as apiRegister, refreshToken as apiRefreshToken, logout as apiLogout } from "@/lib/api";

// Refresh token buffer: refresh this many seconds before expiry
const TOKEN_REFRESH_BUFFER_SEC = 60;
// Minimum delay between refresh attempts in ms
const TOKEN_REFRESH_MIN_DELAY_MS = 10000;

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(() => {
    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
  });
  const [isLoading, setIsLoading] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const clearAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wasLoggedIn", new Date().toISOString());
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("tokenExpiry");
    }
    setToken(null);
    setUser(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresIn: number, storedRefreshToken: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Refresh TOKEN_REFRESH_BUFFER_SEC seconds before expiry, minimum TOKEN_REFRESH_MIN_DELAY_MS
    const refreshDelay = Math.max((expiresIn - TOKEN_REFRESH_BUFFER_SEC) * 1000, TOKEN_REFRESH_MIN_DELAY_MS);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await apiRefreshToken(storedRefreshToken);
        if (response.accessToken) {
          localStorage.setItem("token", response.accessToken);
          setToken(response.accessToken);

          if (response.refreshToken) {
            localStorage.setItem("refreshToken", response.refreshToken);
          }

          const newExpiry = response.expiresIn ?? 3600;
          localStorage.setItem("tokenExpiry", String(Date.now() + newExpiry * 1000));

          const nextRefreshToken = response.refreshToken ?? storedRefreshToken;
          scheduleTokenRefresh(newExpiry, nextRefreshToken);
        }
      } catch {
        clearAuth();
      }
    }, refreshDelay);
  }, [clearAuth]);

  // On mount, schedule refresh if we have a refresh token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const tokenExpiry = localStorage.getItem("tokenExpiry");

    if (storedRefreshToken && tokenExpiry && token) {
      const expiryMs = parseInt(tokenExpiry, 10);
      const remainingMs = expiryMs - Date.now();
      const remainingSec = Math.max(Math.floor(remainingMs / 1000), 0);

      if (remainingSec > 0) {
        scheduleTokenRefresh(remainingSec, storedRefreshToken);
      } else {
        // Token already expired, try refresh immediately
        apiRefreshToken(storedRefreshToken)
          .then((response) => {
            if (response.accessToken) {
              localStorage.setItem("token", response.accessToken);
              setToken(response.accessToken);
              if (response.refreshToken) {
                localStorage.setItem("refreshToken", response.refreshToken);
              }
              const newExpiry = response.expiresIn ?? 3600;
              localStorage.setItem("tokenExpiry", String(Date.now() + newExpiry * 1000));
              scheduleTokenRefresh(newExpiry, response.refreshToken ?? storedRefreshToken);
            }
          })
          .catch(() => {
            clearAuth();
          });
      }
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password);

    if (response.accessToken) {
      const accessToken = response.accessToken;
      const refreshTokenValue = response.refreshToken ?? null;
      const expiresIn = response.expiresIn ?? 3600;

      // Decode user info from JWT payload
      let userData: UserDto | null = null;
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        userData = {
          id: parseInt(payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "0", 10),
          username: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || username,
          displayName: payload["displayName"] || username,
        };
      } catch {
        throw new Error("Invalid authentication response");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        if (refreshTokenValue) {
          localStorage.setItem("refreshToken", refreshTokenValue);
        }
        localStorage.setItem("tokenExpiry", String(Date.now() + expiresIn * 1000));
      }

      setToken(accessToken);
      setUser(userData);

      if (refreshTokenValue) {
        scheduleTokenRefresh(expiresIn, refreshTokenValue);
      }
    } else {
      throw new Error("Invalid authentication response");
    }
  };

  const register = async (
    username: string,
    password: string,
    displayName: string
  ) => {
    const response = await apiRegister(username, password, displayName);
    // Register now returns OAuthTokenResponse (same as login)
    if (response.accessToken) {
      const accessToken = response.accessToken;
      const refreshTokenValue = response.refreshToken ?? null;
      const expiresIn = response.expiresIn ?? 3600;

      // Decode user info from JWT payload
      let userData: UserDto | null = null;
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1]));
        userData = {
          id: parseInt(payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "0", 10),
          username: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || username,
          displayName: payload["displayName"] || username,
        };
      } catch {
        throw new Error("Invalid authentication response");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));
        if (refreshTokenValue) {
          localStorage.setItem("refreshToken", refreshTokenValue);
        }
        localStorage.setItem("tokenExpiry", String(Date.now() + expiresIn * 1000));
      }

      setToken(accessToken);
      setUser(userData);

      if (refreshTokenValue) {
        scheduleTokenRefresh(expiresIn, refreshTokenValue);
      }
    } else {
      throw new Error("Invalid authentication response");
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore errors during logout API call
    }
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
        isLoading,
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
