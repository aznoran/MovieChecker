import axios from "axios";
import {AuthResponse, Movie, WatchEntry, Stats, Group} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add Accept-Language header based on stored locale
    config.headers["Accept-Language"] = localStorage.getItem("locale") || "en";
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("activeGroupId");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login", {
    username,
    password,
  });
  return response.data;
};

export const register = async (
  username: string,
  password: string,
  displayName: string
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register", {
    username,
    password,
    displayName,
  });
  return response.data;
};

export const setLanguage = async (language: "en" | "ru"): Promise<void> => {
  const response = await api.post<{ language: string }>("/auth/language", {
    language,
  });
  // Update localStorage for Accept-Language header
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", response.data.language);
  }
};

// Movies
export const getMovies = async (type?: number): Promise<Movie[]> => {
  const params = type !== undefined ? { type } : {};
  const response = await api.get<Movie[]>("/movies", { params });
  return response.data;
};

export const getMovie = async (id: number): Promise<Movie> => {
  const response = await api.get<Movie>(`/movies/${id}`);
  return response.data;
};

export const createMovie = async (
  movie: Omit<Movie, "id" | "createdAt">
): Promise<Movie> => {
  const response = await api.post<Movie>("/movies", movie);
  return response.data;
};

export const updateMovie = async (
  id: number,
  movie: Partial<Movie>
): Promise<Movie> => {
  const response = await api.put<Movie>(`/movies/${id}`, movie);
  return response.data;
};

export const deleteMovie = async (id: number): Promise<void> => {
  await api.delete(`/movies/${id}`);
};

export const searchMovies = async (query: string): Promise<Movie[]> => {
  const response = await api.get<Movie[]>("/movies/search", {
    params: { q: query },
  });
  return response.data;
};

// Watch Entries
export const getWatchEntries = async (
  status?: number,
  watchedBy?: number,
  groupId?: number
): Promise<WatchEntry[]> => {
  const params: Record<string, number> = {};
  if (status !== undefined) params.status = status;
  if (watchedBy !== undefined) params.watchedBy = watchedBy;
  if (groupId !== undefined) params.groupId = groupId;
  const response = await api.get<WatchEntry[]>("/watch-entries", { params });
  return response.data;
};

export const getWatchEntry = async (id: number): Promise<WatchEntry> => {
  const response = await api.get<WatchEntry>(`/watch-entries/${id}`);
  return response.data;
};

export const createWatchEntry = async (entry: {
  movieId: number;
  status: number;
  watchedBy: number;
  emotion?: number;
  comment?: string;
  groupId?: number;
  rating?: number;
  ratings?: { userId: number; rating: number }[];
}): Promise<WatchEntry> => {
  const response = await api.post<WatchEntry>("/watch-entries", entry);
  return response.data;
};

export const updateWatchEntry = async (
  id: number,
  entry: {
    status?: number;
    watchedBy?: number;
    emotion?: number;
    comment?: string;
    rating?: number;
    ratings?: { userId: number; rating: number }[];
  }
): Promise<WatchEntry> => {
  const response = await api.put<WatchEntry>(`/watch-entries/${id}`, entry);
  return response.data;
};

export const rateEntry = async (
  entryId: number,
  rating: number
): Promise<void> => {
  await api.post(`/watch-entries/${entryId}/rate`, { rating });
};

export const deleteWatchEntry = async (id: number): Promise<void> => {
  await api.delete(`/watch-entries/${id}`);
};

export const getStats = async (groupId?: number): Promise<Stats> => {
  const params: Record<string, number> = {};
  if (groupId !== undefined) params.groupId = groupId;
  const response = await api.get<Stats>("/watch-entries/stats", { params });
  return response.data;
};

// Groups
export const getMyGroups = async (): Promise<Group[]> => {
  const response = await api.get<Group[]>("/groups");
  return response.data;
};

export const getGroup = async (id: number): Promise<Group> => {
  const response = await api.get<Group>(`/groups/${id}`);
  return response.data;
};

export const createGroup = async (name: string, isPrivate: boolean = false, password?: string, defaultRole?: number): Promise<Group> => {
  const response = await api.post<Group>("/groups", { name, isPrivate, password, defaultRole });
  return response.data;
};

export const checkInviteCode = async (inviteCode: string): Promise<{
  exists: boolean;
  isPrivate: boolean;
  hasPassword: boolean;
  groupName: string | null;
}> => {
  const response = await api.post("/groups/check-invite", { inviteCode });
  return response.data;
};

export const joinGroup = async (inviteCode: string, password?: string, otp?: string): Promise<Group> => {
  const response = await api.post<Group>("/groups/join", { inviteCode, password, otp });
  return response.data;
};

export const leaveGroup = async (id: number): Promise<void> => {
  await api.delete(`/groups/${id}/leave`);
};

export const kickMember = async (groupId: number, userId: number): Promise<void> => {
  await api.delete(`/groups/${groupId}/members/${userId}`);
};

export const transferOwnership = async (groupId: number, newOwnerId: number): Promise<void> => {
  await api.put(`/groups/${groupId}/transfer`, { newOwnerId });
};

export const updateMemberRole = async (groupId: number, userId: number, role: number): Promise<void> => {
  await api.put(`/groups/${groupId}/members/${userId}/role`, { role });
};

export const generateOtp = async (groupId: number): Promise<{ code: string; expiresAt: string }> => {
  const response = await api.post(`/groups/${groupId}/generate-otp`);
  return response.data;
};

export const updateGroupPassword = async (groupId: number, newPassword?: string): Promise<void> => {
  await api.put(`/groups/${groupId}/password`, { newPassword });
};

// Upload
export const uploadPoster = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ id: number }>("/upload/poster", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.id.toString();
};

export const getPosterUrl = (posterIdOrPath: string | undefined | null): string | null => {
  if (!posterIdOrPath) return null;
  if (posterIdOrPath.startsWith("http")) return posterIdOrPath;
  const base = API_URL.replace("/api", "");
  if (/^\d+$/.test(posterIdOrPath)) {
    return `${base}/api/posters/${posterIdOrPath}`;
  }
  return `${base}${posterIdOrPath}`;
};

export default api;
