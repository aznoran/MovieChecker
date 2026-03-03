"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { useGroup } from "@/context/group-context";
import { useMyPermissions } from "@/hooks/api";
import type { PermissionsResponse } from "@/lib/api/generated";
import { GroupType } from "@/lib/api/generated";

/** All permissions default to true (personal/owner mode) */
const ALL_PERMISSIONS: PermissionsResponse = {
    permissionFlags: -1,
    canViewEntries: true,
    canCreateEntries: true,
    canEditOwnEntries: true,
    canEditAllEntries: true,
    canDeleteOwnEntries: true,
    canDeleteAllEntries: true,
    canRateSelf: true,
    canRateOthers: true,
    canManageMembers: true,
    canManageGroup: true,
};

/** All permissions default to false (loading/unauthenticated) */
const NO_PERMISSIONS: PermissionsResponse = {
    permissionFlags: 0,
    canViewEntries: false,
    canCreateEntries: false,
    canEditOwnEntries: false,
    canEditAllEntries: false,
    canDeleteOwnEntries: false,
    canDeleteAllEntries: false,
    canRateSelf: false,
    canRateOthers: false,
    canManageMembers: false,
    canManageGroup: false,
};

interface PermissionsContextValue {
    permissions: PermissionsResponse;
    isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
    permissions: NO_PERMISSIONS,
    isLoading: false,
});

export function PermissionsProvider({children}: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const {activeGroup} = useGroup();
    const isGroupMode = !!activeGroup && activeGroup.groupType !== GroupType.Personal;

    const {data, isLoading} = useMyPermissions(activeGroup?.id ?? 0, {
        enabled: !!session && isGroupMode && !!activeGroup?.id,
    });

    // Personal mode → full permissions; group mode → API permissions or none while loading
    const permissions = !isGroupMode
        ? ALL_PERMISSIONS
        : (data ?? NO_PERMISSIONS);

    return (
        <PermissionsContext.Provider value={{permissions, isLoading: isGroupMode && isLoading}}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    return useContext(PermissionsContext);
}
