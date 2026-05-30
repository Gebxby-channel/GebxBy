export type VoteDirection = 'UP' | 'DOWN' | 'NONE';

export interface PublicUser {
  userID: string;
  name: string;
  picture?: string;
  designation?: string;
  moto?: string;
  suspensionMarked?: boolean;
  suspendedUntil?: string;
}

export interface CurrentUser extends PublicUser {
  email: string;
  role: 'USER' | 'ADMIN' | string;
}

export interface ContentItem {
  idContent: string;
  head: string;
  subtitle?: string;
  paragrafs: string;
  user?: PublicUser;
  kategori: string;
  createdAt?: string;
  updatedAt?: string;
  viewCount: number;
  upCount: number;
  downCount: number;
  commentCount: number;
  userVote: VoteDirection;
}

export interface ContentStats {
  idContent: string;
  viewCount: number;
  upCount: number;
  downCount: number;
  commentCount: number;
  userVote: VoteDirection;
}

export interface CommentItem {
  id: string;
  contentId: string;
  parentId?: string;
  user?: PublicUser;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  deleted: boolean;
  replies: CommentItem[];
}

export interface LeaderboardEntry {
  user: PublicUser;
  upCount: number;
}

export interface AnalyticsPayload {
  mostRead: ContentItem[];
  mostUpvoted: ContentItem[];
  weeklyLeaderboard: LeaderboardEntry[];
}
