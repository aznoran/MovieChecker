"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "@/lib/api";
import { login as apiLogin, register as apiRegister } from "@/lib/api";

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(() => {
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

  const login = async (username: string, password: string) => {
    const response = await apiLogin(username, password);
    // Save to localStorage synchronously before state update
    if (response.token && response.user) {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      setToken(response.token);
      setUser(response.user as User);
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
      setUser(response.user as User);
    } else {
      throw new Error("Invalid authentication response");
    }
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
