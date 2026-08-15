import { UserPhoto } from "./user";

export type FeedCategory =
  | "ALL"
  | "TEACHING"
  | "TESTIMONY"
  | "ADVICE"
  | "ANNOUNCEMENT"
  | "QUOTE"
  | "VERSE"
  | "NEWS";

export type FeedMediaType = "IMAGE" | "GALLERY" | "VIDEO" | "YOUTUBE" | "QUOTE_CARD";

export interface FeedAuthor {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  isOfficialTeam: boolean;
  isVerified: boolean;
  badgeLabel: string;
}

export interface FeedComment {
  id: string;
  publicationId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorBadge?: string;
  isOfficialResponse?: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: FeedComment[];
}

export interface FeedPublication {
  id: string;
  author: FeedAuthor;
  title?: string;
  content: string;
  category: FeedCategory;
  categoryLabel: string;
  mediaType?: FeedMediaType;
  images?: UserPhoto[];
  videoUrl?: string;
  videoThumbnail?: string;
  quoteText?: string;
  quoteAuthor?: string;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
  hasLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  comments: FeedComment[];
}
