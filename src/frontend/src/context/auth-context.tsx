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
import { login as apiLogin, register as apiRegister } from "@/lib/api";
import { getUserManager } from "@/lib/oidc";
import type { User as OidcUser } from "oidc-client-ts";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  loginWithAuthentik: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const locale = localStorage.getItem("locale") || "en";
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Accept-Language": locale,
        },
      });
      if (res.ok) {
        const userData: UserDto = await res.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch {
      // Profile fetch failed
    }
  }, []);

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

  // Initialize OIDC: check for existing Authentik session
  useEffect(() => {
    const init = async () => {
      try {
        const mgr = getUserManager();
        const oidcUser = await mgr.getUser();
        if (oidcUser && !oidcUser.expired) {
          setToken(oidcUser.access_token);
          localStorage.setItem("token", oidcUser.access_token);
          await fetchUserProfile(oidcUser.access_token);
        }

        // Listen for token renewal
        mgr.events.addUserLoaded(async (updatedUser: OidcUser) => {
          setToken(updatedUser.access_token);
          localStorage.setItem("token", updatedUser.access_token);
        });

        mgr.events.addUserUnloaded(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("activeGroupId");
        });

        mgr.events.addAccessTokenExpired(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("activeGroupId");
          localStorage.setItem("wasLoggedIn", new Date().toISOString());
        });
      } catch {
        // OIDC initialization failed, custom JWT auth still works
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [fetchUserProfile]);

  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    // Save to localStorage synchronously before state update
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
  };

  const register = async (
    username: string,
    password: string,
    displayName: string
  ) => {
    const response = await apiRegister(username, password, displayName);
    // Save to localStorage synchronously before state update
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
  };

  const loginWithAuthentik = async () => {
    const mgr = getUserManager();
    await mgr.signinRedirect();
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      // Store logout timestamp to remember user was logged in
      localStorage.setItem("wasLoggedIn", new Date().toISOString());
      // Remove token and user synchronously before state update
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
    }
    setToken(null);
    setUser(null);

    // Try OIDC signout if available (non-blocking)
    try {
      const mgr = getUserManager();
      mgr.signoutRedirect().catch(() => {});
    } catch {
      // If OIDC signout fails, local logout is already done
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithAuthentik,
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
