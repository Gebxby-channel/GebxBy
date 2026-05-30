export type VoteDirection = 'UP' | 'DOWN' | 'NONE';

export type BadgeCode =
  | 'ADMIN'
  | 'MODERATOR'
  | 'WRITERS'
  | 'SURVIVOR'
  | 'MEDIA_TEC'
  | 'LIGA'
  | 'CRIMINAL'
  | 'SPEED'
  | 'SMILE'
  | 'REQUIEM';

export interface Badge {
  code: BadgeCode;
  label: string;
  description: string;
  icon: string;
  automatic: boolean;
}

export interface PublicUser {
  userID: string;
  name: string;
  picture?: string;
  designation?: string;
  moto?: string;
  suspensionMarked?: boolean;
  suspendedUntil?: string;
  badges?: Badge[];
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
  adminHighlighted?: boolean;
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

export type NotificationType = 'COMMENT' | 'ADMIN_MESSAGE';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actorUserId?: string;
  actorName?: string;
  actorPhoto?: string;
  contentId?: string;
  contentTitle?: string;
  commentId?: string;
  read: boolean;
  createdAt?: string;
  expiresAt?: string;
}
