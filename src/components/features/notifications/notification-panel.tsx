"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNotification } from "@/domain/types/notification";
import { notificationService } from "@/domain/services/notification.service";
import { NotificationItem } from "@/components/features/notifications/notification-item";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, CheckCheck } from "lucide-react";

const PREVIEW_LIMIT = 8;

interface NotificationPanelProps {
  onClose: () => void;
  onChanged?: () => void;
}

/**
 * Panneau déroulant (façon Facebook) affiché par-dessus la page en cours,
 * sans navigation — la page derrière (scroll, filtres, etc.) reste intacte
 * une fois le panneau refermé, contrairement à l'ancien lien qui menait
 * vers /notifications en page pleine et faisait perdre la position de lecture.
 */
export function NotificationPanel({ onClose, onChanged }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    notificationService
      .getNotifications("ALL")
      .then((data) => setNotifications(data.slice(0, PREVIEW_LIMIT)))
      .finally(() => setIsLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await notificationService.markAsRead(id);
    onChanged?.();
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllAsRead();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationService.deleteNotification(id);
    onChanged?.();
  };

  return (
    <div className="w-[calc(100vw-2rem)] sm:w-96 max-w-96 bg-card border border-border/40 rounded-3xl shadow-soft overflow-hidden flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 shrink-0">
        <h3 className="text-sm font-display font-semibold text-foreground tracking-tight">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck size={13} /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <EmptyState icon={<Bell size={22} />} title="Aucune notification" description="Tu es à jour." className="my-2" />
        )}

        {!isLoading &&
          notifications.map((n) => (
            <div key={n.id} onClickCapture={() => n.targetUrl && onClose()}>
              <NotificationItem notification={n} onMarkAsRead={handleMarkAsRead} onDelete={handleDelete} />
            </div>
          ))}
      </div>

      <Link
        href="/notifications"
        onClick={onClose}
        className="block text-center text-xs font-semibold text-foreground py-3 border-t border-border/40 hover:bg-secondary/50 transition-colors shrink-0"
      >
        Voir toutes mes notifications
      </Link>
    </div>
  );
}
