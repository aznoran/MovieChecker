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
import { getUserManager } from "@/lib/oidc";
import type { User as OidcUser } from "oidc-client-ts";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
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
      // Profile fetch failed, user will be provisioned on next API call
    }
  }, []);

  const handleOidcUser = useCallback(async (oidcUser: OidcUser | null) => {
    if (oidcUser && !oidcUser.expired) {
      setToken(oidcUser.access_token);
      localStorage.setItem("token", oidcUser.access_token);
      await fetchUserProfile(oidcUser.access_token);
    } else {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const init = async () => {
      try {
        const mgr = getUserManager();
        const oidcUser = await mgr.getUser();
        await handleOidcUser(oidcUser);

        // Listen for new login and token renewal
        mgr.events.addUserLoaded(async (updatedUser) => {
          setToken(updatedUser.access_token);
          localStorage.setItem("token", updatedUser.access_token);
          await fetchUserProfile(updatedUser.access_token);
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
        // OIDC initialization failed
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [handleOidcUser]);

  const login = async () => {
    const mgr = getUserManager();
    await mgr.signinRedirect({ prompt: "login" });
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wasLoggedIn", new Date().toISOString());
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
    }
    setToken(null);
    setUser(null);
    try {
      const mgr = getUserManager();
      // Remove local OIDC state first so we don't auto-login on return
      await mgr.removeUser();
      // Redirect to Authentik to end the session there too
      await mgr.signoutRedirect();
    } catch {
      // If signout redirect fails, go to login page directly
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
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
