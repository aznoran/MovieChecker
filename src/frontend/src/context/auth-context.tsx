"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserDto } from "@/lib/api/generated";
import { oidcCallback } from "@/lib/api";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  handleOidcCallback: (code: string, redirectUri: string, codeVerifier?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTHENTIK_URL = process.env.NEXT_PUBLIC_AUTHENTIK_URL || "http://localhost:9000";

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

  const handleOidcCallback = useCallback(async (code: string, redirectUri: string, codeVerifier?: string) => {
    setIsLoading(true);
    try {
      const response = await oidcCallback(code, redirectUri, codeVerifier);
      if (response.token && response.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", response.token);
          localStorage.setItem("user", JSON.stringify(response.user));
        }
        setToken(response.token);
        setUser(response.user);
      } else {
        throw new Error("Invalid authentication response");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wasLoggedIn", new Date().toISOString());
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
    }
    setToken(null);
    setUser(null);

    // Redirect to Authentik logout then back to login
    if (typeof window !== "undefined") {
      const postLogoutRedirect = encodeURIComponent(window.location.origin + "/login");
      window.location.href = `${AUTHENTIK_URL}/application/o/moviechecker/end-session/?post_logout_redirect_uri=${postLogoutRedirect}`;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        handleOidcCallback,
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
