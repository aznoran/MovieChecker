import {
    Api,
    WatchStatus,
    GroupRole,
    CreateMovieRequest,
    UpdateMovieRequest,
    AuthResponse,
    MovieDto,
    WatchEntryDto,
    GroupDto,
    StatsDto,
    OAuthTokenResponse,
} from "./generated";


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Create API instance with security worker for JWT
const apiClient = new Api({
    baseURL: API_URL,
    securityWorker: async () => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            const locale = localStorage.getItem("locale") || "en";
            return {
                headers: {
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                    "Accept-Language": locale,
                },
            };
        }
        return {};
    },
    secure: true,
});

// Add response interceptor for 401 handling
apiClient.instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const isAuthRequest = error.config?.url?.includes("/auth/");
        if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthRequest) {
            // Try to refresh the token before logging out
            const storedRefreshToken = localStorage.getItem("refreshToken");
            if (storedRefreshToken && !error.config?._retry) {
                error.config._retry = true;
                try {
                    const response = await refreshToken(storedRefreshToken);
                    if (response.accessToken) {
                        localStorage.setItem("token", response.accessToken);
                        if (response.refreshToken) {
                            localStorage.setItem("refreshToken", response.refreshToken);
                        }
                        const expiry = response.expiresIn ?? 3600;
                        localStorage.setItem("tokenExpiry", String(Date.now() + expiry * 1000));
                        // Retry the original request with new token
                        error.config.headers.Authorization = `Bearer ${response.accessToken}`;
                        return apiClient.instance.request(error.config);
                    }
                } catch {
                    // Refresh failed, proceed with logout
                }
            }

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("activeGroupId");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("tokenExpiry");
            // Mark that user was logged in for redirect logic
            localStorage.setItem("wasLoggedIn", new Date().toISOString());
            // Defer the redirect to allow the promise rejection to be handled first
            // This prevents the "message channel closed" error
            setTimeout(() => {
                window.location.href = "/login?sessionExpired=true";
            }, 0);
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = async (username: string, password: string): Promise<OAuthTokenResponse> => {
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.post<OAuthTokenResponse>(`/api/auth/login`, {username, password}, {
        headers: {
            "Accept-Language": locale,
        },
    });
    return response.data;
};

export const register = async (username: string, password: string, displayName: string): Promise<OAuthTokenResponse> => {
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.post<OAuthTokenResponse>(`/api/auth/register`, {username, password, displayName}, {
        headers: {
            "Accept-Language": locale,
        },
    });
    return response.data;
};

export const refreshToken = async (refreshTokenValue: string): Promise<OAuthTokenResponse> => {
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.post<OAuthTokenResponse>(`/api/auth/refresh`, {refreshToken: refreshTokenValue}, {
        headers: {
            "Accept-Language": locale,
        },
    });
    return response.data;
};

export const logout = async (): Promise<void> => {
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
        await apiClient.instance.post(`/api/auth/logout`, {}, {
            headers: {
                ...(token ? {Authorization: `Bearer ${token}`} : {}),
                "Accept-Language": locale,
            },
        });
    } catch {
        // Ignore errors during logout
    }
};

export const setLanguage = async (language: "en" | "ru"): Promise<void> => {
    const response = await apiClient.api.authLanguageCreate({language});
    if (typeof window !== "undefined") {
        localStorage.setItem("locale", response.data.language || language);
    }
};

export const getMovie = async (id: number): Promise<MovieDto> => {
    const response = await apiClient.api.moviesDetail(id);
    return response.data;
};

export const createMovie = async (movie: CreateMovieRequest): Promise<MovieDto> => {
    const response = await apiClient.api.moviesCreate(movie);
    return response.data;
};

export const updateMovie = async (id: number, movie: UpdateMovieRequest): Promise<MovieDto> => {
    const response = await apiClient.api.moviesUpdate(id, movie);
    return response.data;
};

export const deleteMovie = async (id: number): Promise<void> => {
    await apiClient.api.moviesDelete(id);
};

export const searchMovies = async (query: string): Promise<MovieDto[]> => {
    const response = await apiClient.api.moviesSearchList({q: query});
    return response.data;
};

// Watch Entries
export const getWatchEntries = async (status?: WatchStatus, groupId?: number): Promise<WatchEntryDto[]> => {
    const query: { status?: WatchStatus; groupId?: number } = {};
    if (status !== undefined) query.status = status;
    if (groupId !== undefined) query.groupId = groupId;
    const response = await apiClient.api.watchEntriesList(query);
    return response.data;
};

export const getWatchEntry = async (id: number): Promise<WatchEntryDto> => {
    const response = await apiClient.api.watchEntriesDetail(id);
    return response.data;
};

export const createWatchEntry = async (entry: {
    movieId: number;
    status: WatchStatus;
    comment?: string;
    groupId?: number;
    rating?: number;
    ratings?: { userId: number; rating: number }[];
    viewers?: number[];
}): Promise<WatchEntryDto> => {
    const response = await apiClient.api.watchEntriesCreate(entry);
    return response.data;
};

export const updateWatchEntry = async (
    id: number,
    entry: {
        status?: WatchStatus;
        comment?: string;
        currentSeason?: number;
        currentEpisode?: number;
        totalEpisodes?: number;
        watchingTime?: number;
    }
): Promise<WatchEntryDto> => {
    const response = await apiClient.api.watchEntriesUpdate(id, entry);
    return response.data;
};

export const rateEntry = async (entryId: number, rating: number, targetUserId?: number): Promise<void> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    await apiClient.instance.post(`/api/watch-entries/${entryId}/rate`, {rating, targetUserId}, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
};

export const deleteWatchEntry = async (id: number): Promise<void> => {
    await apiClient.api.watchEntriesDelete(id);
};

export const getStats = async (groupId?: number): Promise<StatsDto> => {
    const response = await apiClient.api.watchEntriesStatsList(groupId !== undefined ? {groupId} : undefined);
    return response.data;
};

// Groups
export const getMyGroups = async (): Promise<GroupDto[]> => {
    const response = await apiClient.api.groupsList();
    return response.data;
};

export const getGroup = async (id: number): Promise<GroupDto> => {
    const response = await apiClient.api.groupsDetail(id);
    return response.data;
};

export const createGroup = async (name: string, isPrivate: boolean = false, defaultRole?: GroupRole): Promise<GroupDto> => {
    const response = await apiClient.api.groupsCreate({
        name,
        isPrivate,
        defaultRole
    });
    return response.data;
};

export const checkInviteCode = async (inviteCode: string): Promise<{
    exists: boolean;
    isPrivate: boolean;
    groupName: string | null;
}> => {
    const response = await apiClient.api.groupsCheckInviteCreate({inviteCode});
    return {
        exists: response.data.exists ?? false,
        isPrivate: response.data.isPrivate ?? false,
        groupName: response.data.groupName ?? null,
    };
};

export const joinGroup = async (inviteCode: string, otp?: string, inviteLinkToken?: string): Promise<GroupDto> => {
    const response = await apiClient.api.groupsJoinCreate({inviteCode, otp, inviteLinkToken});
    return response.data;
};

export const leaveGroup = async (id: number): Promise<void> => {
    await apiClient.api.groupsLeaveDelete(id);
};

export const kickMember = async (groupId: number, userId: number): Promise<void> => {
    await apiClient.api.groupsMembersDelete(groupId, userId);
};

export const transferOwnership = async (groupId: number, newOwnerId: number): Promise<void> => {
    await apiClient.api.groupsTransferUpdate(groupId, {newOwnerId});
};

export const updateMemberRole = async (groupId: number, userId: number, role: GroupRole): Promise<void> => {
    await apiClient.api.groupsMembersRoleUpdate(groupId, userId, {role});
};

export const generateOtp = async (groupId: number): Promise<{ code: string; expiresAt: string }> => {
    const response = await apiClient.api.groupsGenerateOtpCreate(groupId);
    return {
        code: response.data.code ?? "",
        expiresAt: response.data.expiresAt ?? "",
    };
};

export const updateGroupSettings = async (groupId: number, settings: {
    name?: string;
    isPrivate?: boolean;
    defaultRole?: GroupRole;
}): Promise<GroupDto> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.put(`/api/groups/${groupId}/settings`, settings, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data;
};

// Invite Links
export interface InviteLinkDto {
    id: number;
    token: string;
    url: string;
    expiresAt: string | null;
    maxUses: number | null;
    useCount: number;
    createdAt: string;
}

export const createInviteLink = async (groupId: number, expiresInMinutes?: number, maxUses?: number): Promise<InviteLinkDto> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.post(`/api/groups/${groupId}/invite-links`, {
        expiresInMinutes: expiresInMinutes ?? null,
        maxUses: maxUses ?? null,
    }, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data as InviteLinkDto;
};

export const getInviteLinks = async (groupId: number): Promise<InviteLinkDto[]> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.get(`/api/groups/${groupId}/invite-links`, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data as InviteLinkDto[];
};

export const deleteInviteLink = async (groupId: number, linkId: number): Promise<void> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    await apiClient.instance.delete(`/api/groups/${groupId}/invite-links/${linkId}`, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
};

// Permissions
export interface UserPermissions {
    permissionFlags: number;
    canViewEntries: boolean;
    canCreateEntries: boolean;
    canEditOwnEntries: boolean;
    canEditAllEntries: boolean;
    canDeleteOwnEntries: boolean;
    canDeleteAllEntries: boolean;
    canRateSelf: boolean;
    canRateOthers: boolean;
    canManageMembers: boolean;
    canManageGroup: boolean;
}

export const getMyPermissions = async (groupId: number): Promise<UserPermissions> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.get(`/api/groups/${groupId}/my-permissions`, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data as UserPermissions;
};

// Upload
export const uploadPoster = async (file: File): Promise<string> => {
    const response = await apiClient.api.uploadPosterCreate({file});
    return (response.data.id || 0).toString();
};

export const getPosterUrl = (posterIdOrPath: string | undefined | null): string | null => {
    if (!posterIdOrPath) return null;
    if (posterIdOrPath.startsWith("http")) return posterIdOrPath;
    const base = API_URL;
    if (/^\d+$/.test(posterIdOrPath)) {
        return `${base}/api/posters/${posterIdOrPath}`;
    }
    return `${base}${posterIdOrPath}`;
};

// User Settings
export const getUserSettings = async (): Promise<{
    preventOthersAddingToMyPersonal: boolean;
    preventMeAddingToMyPersonal: boolean;
}> => {
    const response = await apiClient.api.userSettingsList();
    return {
        preventOthersAddingToMyPersonal: response.data.preventOthersAddingToMyPersonal ?? false,
        preventMeAddingToMyPersonal: response.data.preventMeAddingToMyPersonal ?? false,
    };
};

export const updateUserSettings = async (settings: {
    preventOthersAddingToMyPersonal?: boolean;
    preventMeAddingToMyPersonal?: boolean;
}): Promise<{
    preventOthersAddingToMyPersonal: boolean;
    preventMeAddingToMyPersonal: boolean;
}> => {
    const response = await apiClient.api.userSettingsUpdate(settings);
    return {
        preventOthersAddingToMyPersonal: response.data.preventOthersAddingToMyPersonal ?? false,
        preventMeAddingToMyPersonal: response.data.preventMeAddingToMyPersonal ?? false,
    };
};

// Member Permissions
export interface MemberPermissionDetail {
    roleDefaultFlags: number;
    grantedPermissionsFlags: number;
    revokedPermissionsFlags: number;
    effectivePermissionsFlags: number;
    canViewEntries: boolean;
    canCreateEntries: boolean;
    canEditOwnEntries: boolean;
    canEditAllEntries: boolean;
    canDeleteOwnEntries: boolean;
    canDeleteAllEntries: boolean;
    canRateSelf: boolean;
    canRateOthers: boolean;
    canManageMembers: boolean;
    canManageGroup: boolean;
    hasCustomPermissions: boolean;
}

export const getMemberPermissions = async (groupId: number, userId: number): Promise<MemberPermissionDetail> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.get(`/api/groups/${groupId}/members/${userId}/permissions`, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data as MemberPermissionDetail;
};

export const updateMemberPermissions = async (groupId: number, userId: number, granted: number, revoked: number): Promise<MemberPermissionDetail> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
    const response = await apiClient.instance.put(`/api/groups/${groupId}/members/${userId}/permissions`, {
        grantedPermissions: granted,
        revokedPermissions: revoked,
    }, {
        headers: {
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
            "Accept-Language": locale,
        },
    });
    return response.data as MemberPermissionDetail;
};

// Export the API client instance for direct access if needed
export default apiClient;
