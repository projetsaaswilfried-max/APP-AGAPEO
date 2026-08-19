import type { NotificationRow, NotificationTypeDb } from "@/lib/supabase/database.types";
import type { AppNotification, NotificationCategory, NotificationIconType } from "@/domain/types/notification";

const TYPE_TO_CATEGORY: Record<NotificationTypeDb, Exclude<NotificationCategory, "ALL" | "UNREAD">> = {
  NEW_MESSAGE: "MESSAGES",
  NEW_FAVORITE: "PROFILE",
  PROFILE_VISIT: "PROFILE",
  POST_LIKE: "PUBLICATIONS",
  POST_COMMENT: "PUBLICATIONS",
  NEW_RECOMMENDATION: "RECOMMENDATIONS",
  OFFICIAL_POST: "PLATFORM",
  SUPPORT_REPLY: "PLATFORM",
  NEW_RESOURCE: "PLATFORM"
};

const TYPE_TO_ICON: Record<NotificationTypeDb, NotificationIconType> = {
  NEW_MESSAGE: "MESSAGE",
  NEW_FAVORITE: "FAVORITE",
  PROFILE_VISIT: "VIEW",
  POST_LIKE: "LIKE",
  POST_COMMENT: "COMMENT",
  NEW_RECOMMENDATION: "RECOMMENDATION",
  OFFICIAL_POST: "ANNOUNCEMENT",
  SUPPORT_REPLY: "SYSTEM",
  NEW_RESOURCE: "ANNOUNCEMENT"
};

function timeLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

function groupLabel(iso: string): "TODAY" | "THIS_WEEK" | "OLDER" {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);
  if (days < 1) return "TODAY";
  if (days < 7) return "THIS_WEEK";
  return "OLDER";
}

interface ActorInfo {
  name: string;
  avatarUrl: string | null;
}

export function mapNotificationRow(row: NotificationRow, actor?: ActorInfo): AppNotification {
  return {
    id: row.id,
    category: TYPE_TO_CATEGORY[row.type],
    iconType: TYPE_TO_ICON[row.type],
    title: row.title,
    message: row.body ?? "",
    timeLabel: timeLabel(row.created_at),
    groupLabel: groupLabel(row.created_at),
    actorName: actor?.name,
    actorAvatar: actor?.avatarUrl ?? undefined,
    targetUrl: row.target_url ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at
  };
}
