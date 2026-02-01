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

export interface WatchEntry {
  id: number;
  movieId: number;
  movie: Movie;
  status: WatchStatus;
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
}

export enum GroupRole {
  Viewer = 0,
  Member = 1,
  Admin = 2,
  Owner = 3,
}

export enum GroupType {
  Public = 0,
  Private = 1,
  Personal = 2,
}

export interface Group {
  id: number;
  name: string;
  inviteCode: string;
  createdByUserId: number;
  isPrivate: boolean;
  groupType: GroupType;
  defaultRole: GroupRole;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: number;
  displayName: string;
  role: GroupRole;
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

export const GroupRoleLabels: Record<GroupRole, string> = {
  [GroupRole.Viewer]: "Viewer",
  [GroupRole.Member]: "Member",
  [GroupRole.Admin]: "Admin",
  [GroupRole.Owner]: "Owner",
};

export const GroupTypeLabels: Record<GroupType, string> = {
  [GroupType.Public]: "Public",
  [GroupType.Private]: "Private",
  [GroupType.Personal]: "Personal",
};
