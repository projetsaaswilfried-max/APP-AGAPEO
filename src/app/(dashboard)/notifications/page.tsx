"use client";

import React, { useState, useEffect } from "react";
import { AppNotification } from "@/domain/types/notification";
import { notificationService } from "@/domain/services/notification.service";
import { NotificationItem } from "@/components/features/notifications/notification-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Bell, CheckCheck } from "lucide-react";

// Toutes les notifications au même endroit — plus d'onglets par catégorie
// (demande du fondateur), seulement un regroupement par période.
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        setNotifications(await notificationService.getNotifications("ALL"));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await notificationService.markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationService.markAllAsRead();
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationService.deleteNotification(id);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const todayItems = notifications.filter((n) => n.groupLabel === "TODAY");
  const weekItems = notifications.filter((n) => n.groupLabel === "THIS_WEEK");
  const olderItems = notifications.filter((n) => n.groupLabel === "OLDER");

  const groups = [
    { label: "Aujourd'hui", items: todayItems },
    { label: "Cette semaine", items: weekItems },
    { label: "Plus ancien", items: olderItems }
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-8 max-w-2xl mx-auto w-full pb-16 select-none">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tu es à jour."}
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} leftIcon={<CheckCheck size={15} />}>
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lu</span>
            </Button>
          ) : undefined
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-card border border-border/50 rounded-[16px] flex items-center gap-3.5">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <EmptyState
          icon={<Bell size={28} />}
          title="Aucune notification"
          description="Les activités de ton compte et les messages importants apparaîtront ici."
        />
      )}

      {!isLoading &&
        groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((n) => (
                <NotificationItem key={n.id} notification={n} onMarkAsRead={handleMarkAsRead} onDelete={handleDeleteNotification} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
