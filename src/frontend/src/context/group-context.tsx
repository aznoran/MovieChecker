"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import {
  getMyGroups,
  createGroup as apiCreateGroup,
  joinGroup as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
} from "@/lib/api";
import type { Group } from "@/types";

interface GroupContextValue {
  groups: Group[];
  activeGroupId: number | undefined;
  activeGroup: Group | undefined;
  setActiveGroupId: (id: number | undefined) => void;
  createGroup: (name: string) => Promise<Group>;
  joinGroup: (code: string) => Promise<Group>;
  leaveGroup: (id: number) => Promise<void>;
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [activeGroupId, setActiveGroupIdState] = useState<number | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const stored = localStorage.getItem("activeGroupId");
    return stored ? parseInt(stored) : undefined;
  });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: getMyGroups,
    enabled: isAuthenticated,
  });

  const setActiveGroupId = useCallback((id: number | undefined) => {
    setActiveGroupIdState(id);
    if (typeof window !== "undefined") {
      if (id !== undefined) {
        localStorage.setItem("activeGroupId", id.toString());
      } else {
        localStorage.removeItem("activeGroupId");
      }
    }
  }, []);

  // If activeGroupId is set but not in groups list, reset to personal
  useEffect(() => {
    if (!isLoading && activeGroupId !== undefined && !groups.find((g) => g.id === activeGroupId)) {
      setActiveGroupId(undefined);
    }
  }, [groups, activeGroupId, isLoading, setActiveGroupId]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const createMutation = useMutation({
    mutationFn: apiCreateGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setActiveGroupId(group.id);
    },
  });

  const joinMutation = useMutation({
    mutationFn: apiJoinGroup,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setActiveGroupId(group.id);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: apiLeaveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setActiveGroupId(undefined);
    },
  });

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroupId,
        activeGroup,
        setActiveGroupId,
        createGroup: (name) => createMutation.mutateAsync(name),
        joinGroup: (code) => joinMutation.mutateAsync(code),
        leaveGroup: (id) => leaveMutation.mutateAsync(id),
        isLoading,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within GroupProvider");
  return ctx;
}
