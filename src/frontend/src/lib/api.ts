import { Api, WatchStatus, GroupRole, ContentType, CreateMovieRequest, UpdateMovieRequest } from "./api.generated";
import { AuthResponse, Movie, WatchEntry, Stats, Group, GroupMember } from "@/types";

// Re-export types from types folder (these have proper enum names)
export type { AuthResponse, Movie, WatchEntry, Stats, Group, GroupMember };
export { ContentType as ContentTypeEnum, WatchStatus as WatchStatusEnum, Emotion, GroupRole as GroupRoleEnum } from "@/types";

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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  (error) => {
    const isAuthRequest = error.config?.url?.includes("/auth/");
    if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
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
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await apiClient.api.authLoginCreate({ username, password });
  return response.data as unknown as AuthResponse;
};

export const register = async (username: string, password: string, displayName: string): Promise<AuthResponse> => {
  const response = await apiClient.api.authRegisterCreate({ username, password, displayName });
  return response.data as unknown as AuthResponse;
};

export const setLanguage = async (language: "en" | "ru"): Promise<void> => {
  const response = await apiClient.api.authLanguageCreate({ language });
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", response.data.language || language);
  }
};

// Movies
export const getMovies = async (type?: number): Promise<Movie[]> => {
  const response = await apiClient.api.moviesList(type !== undefined ? { type } : undefined);
  return response.data as unknown as Movie[];
};

export const getMovie = async (id: number): Promise<Movie> => {
  const response = await apiClient.api.moviesDetail(id);
  return response.data as unknown as Movie;
};

export const createMovie = async (movie: Omit<Movie, "id" | "createdAt">): Promise<Movie> => {
  const request: CreateMovieRequest = {
    title: movie.title,
    description: movie.description,
    type: movie.type as unknown as ContentType,
    year: movie.year,
    genre: movie.genre,
    posterUrl: movie.posterUrl,
  };
  const response = await apiClient.api.moviesCreate(request);
  return response.data as unknown as Movie;
};

export const updateMovie = async (id: number, movie: Partial<Movie>): Promise<Movie> => {
  const request: UpdateMovieRequest = {
    title: movie.title,
    description: movie.description,
    type: movie.type !== undefined ? movie.type as unknown as ContentType : undefined,
    year: movie.year,
    genre: movie.genre,
    posterUrl: movie.posterUrl,
  };
  const response = await apiClient.api.moviesUpdate(id, request);
  return response.data as unknown as Movie;
};

export const deleteMovie = async (id: number): Promise<void> => {
  await apiClient.api.moviesDelete(id);
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const response = await apiClient.api.moviesSearchList({ q: query });
  return response.data as unknown as Movie[];
};

// Watch Entries
export const getWatchEntries = async (status?: number, groupId?: number): Promise<WatchEntry[]> => {
  const query: { status?: WatchStatus; groupId?: number } = {};
  if (status !== undefined) query.status = status as WatchStatus;
  if (groupId !== undefined) query.groupId = groupId;
  const response = await apiClient.api.watchEntriesList(query);
  return response.data as unknown as WatchEntry[];
};

export const getWatchEntry = async (id: number): Promise<WatchEntry> => {
  const response = await apiClient.api.watchEntriesDetail(id);
  return response.data as unknown as WatchEntry;
};

export const createWatchEntry = async (entry: {
  movieId: number;
  status: number;
  emotion?: number;
  comment?: string;
  groupId?: number;
  rating?: number;
  ratings?: { userId: number; rating: number }[];
  viewers?: number[];
}): Promise<WatchEntry> => {
  const response = await apiClient.api.watchEntriesCreate(entry);
  return response.data as unknown as WatchEntry;
};

export const updateWatchEntry = async (
  id: number,
  entry: {
    status?: number;
    emotion?: number;
    comment?: string;
    viewers?: number[];
    currentSeason?: number;
    currentEpisode?: number;
    totalEpisodes?: number;
    watchingTime?: number;
  }
): Promise<WatchEntry> => {
  const response = await apiClient.api.watchEntriesUpdate(id, entry);
  return response.data as unknown as WatchEntry;
};

export const rateEntry = async (entryId: number, rating: number): Promise<void> => {
  await apiClient.api.watchEntriesRateCreate(entryId, { rating });
};

export const deleteWatchEntry = async (id: number): Promise<void> => {
  await apiClient.api.watchEntriesDelete(id);
};

export const getStats = async (groupId?: number): Promise<Stats> => {
  const response = await apiClient.api.watchEntriesStatsList(groupId !== undefined ? { groupId } : undefined);
  return response.data as unknown as Stats;
};

// Groups
export const getMyGroups = async (): Promise<Group[]> => {
  const response = await apiClient.api.groupsList();
  return response.data as unknown as Group[];
};

export const getGroup = async (id: number): Promise<Group> => {
  const response = await apiClient.api.groupsDetail(id);
  return response.data as unknown as Group;
};

export const createGroup = async (name: string, isPrivate: boolean = false, password?: string, defaultRole?: number): Promise<Group> => {
  const response = await apiClient.api.groupsCreate({ 
    name, 
    isPrivate, 
    password, 
    defaultRole: defaultRole as GroupRole 
  });
  return response.data as unknown as Group;
};

export const checkInviteCode = async (inviteCode: string): Promise<{
  exists: boolean;
  isPrivate: boolean;
  hasPassword: boolean;
  groupName: string | null;
}> => {
  const response = await apiClient.api.groupsCheckInviteCreate({ inviteCode });
  return {
    exists: response.data.exists ?? false,
    isPrivate: response.data.isPrivate ?? false,
    hasPassword: response.data.hasPassword ?? false,
    groupName: response.data.groupName ?? null,
  };
};

export const joinGroup = async (inviteCode: string, password?: string, otp?: string): Promise<Group> => {
  const response = await apiClient.api.groupsJoinCreate({ inviteCode, password, otp });
  return response.data as unknown as Group;
};

export const leaveGroup = async (id: number): Promise<void> => {
  await apiClient.api.groupsLeaveDelete(id);
};

export const kickMember = async (groupId: number, userId: number): Promise<void> => {
  await apiClient.api.groupsMembersDelete(groupId, userId);
};

export const transferOwnership = async (groupId: number, newOwnerId: number): Promise<void> => {
  await apiClient.api.groupsTransferUpdate(groupId, { newOwnerId });
};

export const updateMemberRole = async (groupId: number, userId: number, role: number): Promise<void> => {
  await apiClient.api.groupsMembersRoleUpdate(groupId, userId, { role: role as GroupRole });
};

export const generateOtp = async (groupId: number): Promise<{ code: string; expiresAt: string }> => {
  const response = await apiClient.api.groupsGenerateOtpCreate(groupId);
  return {
    code: response.data.code ?? "",
    expiresAt: response.data.expiresAt ?? "",
  };
};

export const updateGroupPassword = async (groupId: number, newPassword?: string): Promise<void> => {
  await apiClient.api.groupsPasswordUpdate(groupId, { newPassword });
};

export const updateGroupSettings = async (groupId: number, settings: { name?: string; isPrivate?: boolean }): Promise<Group> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const locale = typeof window !== "undefined" ? (localStorage.getItem("locale") || "en") : "en";
  const response = await apiClient.instance.put(`/api/groups/${groupId}/settings`, settings, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Accept-Language": locale,
    },
  });
  return response.data as unknown as Group;
};

// Upload
export const uploadPoster = async (file: File): Promise<string> => {
  const response = await apiClient.api.uploadPosterCreate({ file });
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

// Export the API client instance for direct access if needed
export default apiClient;
