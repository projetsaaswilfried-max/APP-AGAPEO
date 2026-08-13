import { AppNotification, NotificationCategory } from "../types/notification";
import { createClient } from "@/lib/supabase/client";
import { mapNotificationRow } from "@/domain/mappers/notification.mapper";
import type { NotificationRow } from "@/lib/supabase/database.types";

export interface INotificationService {
  getNotifications(category?: NotificationCategory): Promise<AppNotification[]>;
  markAsRead(id: string): Promise<AppNotification>;
  markAllAsRead(): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getUnreadCount(): Promise<number>;
}

class NotificationServiceSupabase implements INotificationService {
  async getNotifications(category: NotificationCategory = "ALL"): Promise<AppNotification[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase.from("notifications").select("*").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (category === "UNREAD") query = query.eq("is_read", false);

    const { data, error } = await query;
    if (error || !data) return [];

    const rows = data as NotificationRow[];
    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id)))];
    const { data: actors } =
      actorIds.length > 0 ? await supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", actorIds) : { data: [] };

    type ActorRow = { id: string; first_name: string; last_name: string; avatar_url: string | null };
    const actorsById = new Map(
      (actors ?? []).map((a: ActorRow) => [a.id, { name: `${a.first_name} ${a.last_name}`.trim(), avatarUrl: a.avatar_url }])
    );

    let notifications = rows.map((row) => mapNotificationRow(row, row.actor_id ? actorsById.get(row.actor_id) : undefined));

    if (category !== "ALL" && category !== "UNREAD") {
      notifications = notifications.filter((n) => n.category === category);
    }

    return notifications;
  }

  async getUnreadCount(): Promise<number> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    return count ?? 0;
  }

  async markAsRead(id: string): Promise<AppNotification> {
    const supabase = createClient();
    const { data, error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).select().single();
    if (error || !data) throw new Error(error?.message ?? "Notification introuvable.");
    return mapNotificationRow(data as NotificationRow);
  }

  async markAllAsRead(): Promise<void> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);
  }

  async deleteNotification(id: string): Promise<void> {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
  }
}

export const notificationService = new NotificationServiceSupabase();
