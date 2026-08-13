"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notificationService } from "@/domain/services/notification.service";

const POLL_INTERVAL_MS = 30000;

/** Compteurs réels (messages non lus + notifications non lues) — jamais de valeur fictive. */
export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [{ data: participations }, notifCount] = await Promise.all([
        supabase.from("conversation_participants").select("conversation_id, last_read_at").eq("user_id", user.id),
        notificationService.getUnreadCount()
      ]);

      if (cancelled) return;

      if (!participations || participations.length === 0) {
        setUnreadMessages(0);
      } else {
        const conversationIds = participations.map((p) => p.conversation_id);
        const { data: unreadRows } = await supabase
          .from("messages")
          .select("conversation_id, created_at")
          .in("conversation_id", conversationIds)
          .neq("sender_id", user.id);

        const byConversation = new Map(participations.map((p) => [p.conversation_id, p.last_read_at]));
        const count = (unreadRows ?? []).filter((row) => {
          const lastRead = byConversation.get(row.conversation_id);
          return lastRead && new Date(row.created_at) > new Date(lastRead);
        }).length;

        if (!cancelled) setUnreadMessages(count);
      }

      if (!cancelled) setUnreadNotifications(notifCount);
    };

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { unreadMessages, unreadNotifications };
}
