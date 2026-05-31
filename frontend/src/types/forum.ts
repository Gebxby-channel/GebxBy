export type VoteDirection = 'UP' | 'DOWN' | 'NONE';

export type ThemeMode = 'dark' | 'light';

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
  id?: string;
  code?: BadgeCode | string | null;
  label: string;
  description: string;
  icon: string;
  automatic: boolean;
  custom?: boolean;
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

export interface ContentImage {
  id: string;
  data: string;
  thumbnail?: string;
  alt?: string;
  size: number;
  mimeType?: string;
  storageProvider?: string;
  storageKey?: string;
  thumbnailStorageKey?: string;
  width?: number;
  height?: number;
}

export interface CurrentUser extends PublicUser {
  email: string;
  role: 'USER' | 'ADMIN' | string;
  bookmarkedContentIds?: string[];
  followingUserIds?: string[];
}

export interface ContentItem {
  idContent: string;
  head: string;
  subtitle?: string;
  paragrafs: string;
  images?: ContentImage[];
  coverImage?: ContentImage;
  user?: PublicUser;
  kategori: string;
  createdAt?: string;
  updatedAt?: string;
  viewCount: number;
  upCount: number;
  downCount: number;
  commentCount: number;
  userVote: VoteDirection;
  status?: 'PUBLISHED' | 'DRAFT' | string;
}

export interface FeedPayload {
  items: ContentItem[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MediaSmokeTestResult {
  provider: string;
  url: string;
  storageKey: string;
  publicReadable: boolean;
  message: string;
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

export interface SearchContentResult {
  idContent: string;
  head: string;
  subtitle?: string;
  kategori: string;
  user?: PublicUser;
  viewCount: number;
  upCount: number;
  commentCount: number;
  createdAt?: string;
}

export interface SearchBadgeResult extends Badge {
  users: PublicUser[];
}

export interface SearchPayload {
  query: string;
  users: PublicUser[];
  contents: SearchContentResult[];
  badges: SearchBadgeResult[];
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
  logId?: string;
  read: boolean;
  createdAt?: string;
  expiresAt?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  adminUserId: string;
  adminName: string;
  adminPhoto?: string;
  createdAt?: string;
}

export type ActivityLogType =
  | 'PUBLICATION'
  | 'ADMIN_MESSAGE'
  | 'MODERATOR_REPORT'
  | 'USER_REPORT'
  | 'USER_SUSPEND'
  | 'CONTENT_DELETE'
  | 'COMMENT_DELETE'
  | 'BADGE_GRANTED'
  | 'BADGE_REVOKED';

export type ActivityTargetType = 'CONTENT' | 'COMMENT' | 'USER' | 'SYSTEM';

export interface ActivityLogItem {
  id: string;
  type: ActivityLogType;
  direction: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
  targetType: ActivityTargetType;
  title: string;
  message: string;
  reason?: string;
  reportCategory?: string;
  actorUserId?: string;
  actorName?: string;
  actorPhoto?: string;
  targetUserId?: string;
  targetUserName?: string;
  contentId?: string;
  contentTitle?: string;
  commentId?: string;
  reportQueue: boolean;
  resolved: boolean;
  createdAt?: string;
  resolvedAt?: string;
}
