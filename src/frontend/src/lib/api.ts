import axios from "axios";
import type { AuthResponse, Movie, WatchEntry, Stats } from "@/types";

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
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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
  watchedBy?: number
): Promise<WatchEntry[]> => {
  const params: Record<string, number> = {};
  if (status !== undefined) params.status = status;
  if (watchedBy !== undefined) params.watchedBy = watchedBy;
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
  myRating?: number;
  partnerRating?: number;
  emotion?: number;
  comment?: string;
  privateComment?: string;
  startedAt?: string;
  completedAt?: string;
}): Promise<WatchEntry> => {
  const response = await api.post<WatchEntry>("/watch-entries", entry);
  return response.data;
};

export const updateWatchEntry = async (
  id: number,
  entry: {
    status?: number;
    watchedBy?: number;
    myRating?: number;
    partnerRating?: number;
    emotion?: number;
    comment?: string;
    privateComment?: string;
    startedAt?: string;
    completedAt?: string;
  }
): Promise<WatchEntry> => {
  const response = await api.put<WatchEntry>(`/watch-entries/${id}`, entry);
  return response.data;
};

export const deleteWatchEntry = async (id: number): Promise<void> => {
  await api.delete(`/watch-entries/${id}`);
};

export const getStats = async (): Promise<Stats> => {
  const response = await api.get<Stats>("/watch-entries/stats");
  return response.data;
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
  // New format: poster ID (numeric string)
  if (/^\d+$/.test(posterIdOrPath)) {
    return `${base}/api/posters/${posterIdOrPath}`;
  }
  // Legacy format: file path
  return `${base}${posterIdOrPath}`;
};

export default api;
