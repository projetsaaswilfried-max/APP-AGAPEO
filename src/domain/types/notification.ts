export type NotificationCategory =
  | "ALL"
  | "UNREAD"
  | "MESSAGES"
  | "PROFILE"
  | "PUBLICATIONS"
  | "RECOMMENDATIONS"
  | "PLATFORM";

export type NotificationIconType =
  | "MESSAGE"
  | "VOICE"
  | "FILE"
  | "VIEW"
  | "FAVORITE"
  | "VERIFIED"
  | "LIKE"
  | "COMMENT"
  | "RECOMMENDATION"
  | "ANNOUNCEMENT"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  iconType: NotificationIconType;
  title: string;
  message: string;
  timeLabel: string;
  groupLabel: "TODAY" | "THIS_WEEK" | "OLDER";
  actorName?: string;
  actorAvatar?: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}
