"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { notificationService } from "@/domain/services/notification.service";

const POLL_INTERVAL_MS = 30000;

/** Compteurs réels (messages non lus + notifications non lues) — jamais de valeur fictive. */
export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  /** Permet un rafraîchissement immédiat (ex : après avoir marqué une notification comme lue dans le panneau) sans attendre le prochain poll. */
  const refresh = () => setRefreshToken((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    const doRefresh = async () => {
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

    doRefresh();
    const interval = setInterval(doRefresh, POLL_INTERVAL_MS);

    // Sans ceci, ce badge (affiché dans Header/Sidebar/BottomNav) ne se
    // mettait à jour qu'au prochain sondage (jusqu'à 30s) — un membre qui
    // ouvre une conversation et lit son message voyait le chiffre rester
    // affiché pendant tout ce temps. `conversation_participants` UPDATE
    // capte le marquage "lu" (n'importe où dans l'app) ; `messages` INSERT
    // capte l'arrivée d'un nouveau message (la RLS `messages_select` limite
    // déjà ce que Realtime peut transmettre à mes propres conversations).
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      channel = supabase
        .channel(`unread-counts:${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` },
          () => doRefresh()
        )
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => doRefresh())
        .subscribe();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refreshToken]);

  return { unreadMessages, unreadNotifications, refresh };
}
