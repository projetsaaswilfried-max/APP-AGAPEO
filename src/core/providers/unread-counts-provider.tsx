"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { notificationService } from "@/domain/services/notification.service";

const POLL_INTERVAL_MS = 30000;

interface UnreadCountsContextValue {
  unreadMessages: number;
  unreadNotifications: number;
  /** Rafraîchissement immédiat (ex : après avoir marqué une notification comme lue dans le panneau) sans attendre le prochain sondage. */
  refresh: () => void;
}

const UnreadCountsContext = createContext<UnreadCountsContextValue | null>(null);

/**
 * Source UNIQUE des compteurs non-lus (messages + notifications) — remplace
 * l'ancien hook `useUnreadCounts` qui était appelé indépendamment 4 fois
 * (AppShell, Header, Sidebar, BottomNav) : chaque instance faisait tourner
 * son propre sondage 30s, son propre canal Realtime, et sa propre requête —
 * soit x4 la charge sur CHAQUE page du site, en continu, pour chaque membre
 * connecté (trouvé en audit performance, 2026-09-07). Un seul Provider ici,
 * monté une fois dans AppShell, que les 4 endroits consomment désormais via
 * `useUnreadCounts()`.
 *
 * Le calcul des messages non lus passe aussi par `get_unread_message_count`
 * (RPC, une seule requête indexée côté base) au lieu de télécharger tous les
 * messages non envoyés par le membre pour les compter en JavaScript — sur
 * une conversation de 177 messages, ça ne coûtait qu'un compte, mais
 * rapatriait quand même chaque ligne.
 */
export function UnreadCountsProvider({ children }: { children: ReactNode }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    const doRefresh = async () => {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [{ data: messageCount }, notifCount] = await Promise.all([
        supabase.rpc("get_unread_message_count"),
        notificationService.getUnreadCount()
      ]);

      if (cancelled) return;
      setUnreadMessages(messageCount ?? 0);
      setUnreadNotifications(notifCount);
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

  return <UnreadCountsContext.Provider value={{ unreadMessages, unreadNotifications, refresh }}>{children}</UnreadCountsContext.Provider>;
}

/** Doit être utilisé dans un descendant de `<UnreadCountsProvider>` (monté dans AppShell). */
export function useUnreadCounts() {
  const ctx = useContext(UnreadCountsContext);
  if (!ctx) {
    throw new Error("useUnreadCounts() doit être appelé à l'intérieur de <UnreadCountsProvider>.");
  }
  return ctx;
}
