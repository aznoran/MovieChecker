export enum ContentType {
  Movie = 0,
  Series = 1,
  Anime = 2,
  Cartoon = 3,
  Show = 4,
}

export enum WatchStatus {
  Planned = 0,
  Watching = 1,
  Completed = 2,
  Dropped = 3,
}

export enum WatchedBy {
  Me = 0,
  Partner = 1,
  Together = 2,
  Separately = 3,
}

export enum Emotion {
  Joy = 0,
  Sadness = 1,
  Excitement = 2,
  Cringe = 3,
  Confused = 4,
  Neutral = 5,
}

export interface User {
  id: number;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Movie {
  id: number;
  title: string;
  description?: string;
  type: ContentType;
  year?: number;
  genre?: string;
  posterUrl?: string;
  createdAt: string;
}

export interface EntryRating {
  id: number;
  userId: number;
  displayName: string;
  rating: number;
}

export interface EntryComment {
  id: number;
  userId: number;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface WatchEntry {
  id: number;
  movieId: number;
  movie: Movie;
  status: WatchStatus;
  watchedBy: WatchedBy;
  groupId?: number;
  emotion?: Emotion;
  comment?: string;
  ratings: EntryRating[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  currentSeason: number;
  currentEpisode: number;
  totalEpisodes: number;
  watchingTime: number;
  lastComment?: EntryComment;
}

export interface Group {
  id: number;
  name: string;
  inviteCode: string;
  createdByUserId: number;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: number;
  displayName: string;
  joinedAt: string;
}

export interface MemberRatingStats {
  userId: number;
  displayName: string;
  averageRating: number;
  totalRated: number;
}

export interface Stats {
  totalWatched: number;
  totalPlanned: number;
  totalWatching: number;
  totalDropped: number;
  averageMyRating: number;
  averagePartnerRating: number;
  watchedTogether: number;
  byType: Record<string, number>;
  byEmotion: Record<string, number>;
  memberRatings?: MemberRatingStats[];
}

export const ContentTypeLabels: Record<ContentType, string> = {
  [ContentType.Movie]: "Film",
  [ContentType.Series]: "Series",
  [ContentType.Anime]: "Anime",
  [ContentType.Cartoon]: "Cartoon",
  [ContentType.Show]: "Show",
};

export const WatchStatusLabels: Record<WatchStatus, string> = {
  [WatchStatus.Planned]: "Planned",
  [WatchStatus.Watching]: "Watching",
  [WatchStatus.Completed]: "Completed",
  [WatchStatus.Dropped]: "Dropped",
};

export const WatchedByLabels: Record<WatchedBy, string> = {
  [WatchedBy.Me]: "Me",
  [WatchedBy.Partner]: "Partner",
  [WatchedBy.Together]: "Together",
  [WatchedBy.Separately]: "Separately",
};

export const EmotionLabels: Record<Emotion, string> = {
  [Emotion.Joy]: "Joy",
  [Emotion.Sadness]: "Sadness",
  [Emotion.Excitement]: "Excitement",
  [Emotion.Cringe]: "Cringe",
  [Emotion.Confused]: "Confused",
  [Emotion.Neutral]: "Neutral",
};

export const EmotionEmojis: Record<Emotion, string> = {
  [Emotion.Joy]: "😊",
  [Emotion.Sadness]: "😢",
  [Emotion.Excitement]: "🤩",
  [Emotion.Cringe]: "😬",
  [Emotion.Confused]: "🤔",
  [Emotion.Neutral]: "😐",
};
