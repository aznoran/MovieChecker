import { useQuery } from '@tanstack/react-query';
import { searchTmdb, searchAniList, getTmdbMovieDetails, getTmdbTvDetails, getAniListAnimeDetails } from '@/lib/api';
import type { ExternalSearchResponse, ExternalContentResult } from '@/lib/api.generated';

export const useTmdbSearch = (query: string, enabled: boolean = true) => {
  return useQuery<ExternalSearchResponse>({
    queryKey: ['tmdb-search', query],
    queryFn: () => searchTmdb(query, 1),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAniListSearch = (query: string, enabled: boolean = true) => {
  return useQuery<ExternalSearchResponse>({
    queryKey: ['anilist-search', query],
    queryFn: () => searchAniList(query, 1),
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useTmdbMovieDetails = (tmdbId: string | undefined) => {
  return useQuery<ExternalContentResult | null>({
    queryKey: ['tmdb-movie', tmdbId],
    queryFn: () => getTmdbMovieDetails(tmdbId!),
    enabled: !!tmdbId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useTmdbTvDetails = (tmdbId: string | undefined) => {
  return useQuery<ExternalContentResult | null>({
    queryKey: ['tmdb-tv', tmdbId],
    queryFn: () => getTmdbTvDetails(tmdbId!),
    enabled: !!tmdbId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useAniListAnimeDetails = (anilistId: string | undefined) => {
  return useQuery<ExternalContentResult | null>({
    queryKey: ['anilist-anime', anilistId],
    queryFn: () => getAniListAnimeDetails(anilistId!),
    enabled: !!anilistId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};
