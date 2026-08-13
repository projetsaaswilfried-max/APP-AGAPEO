"use client";

import React, { useState, useEffect } from "react";
import { AppNotification, NotificationCategory } from "@/domain/types/notification";
import { notificationService } from "@/domain/services/notification.service";
import { NotificationItem } from "@/components/features/notifications/notification-item";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, CheckCheck } from "lucide-react";

const CATEGORY_TABS = [
  { id: "ALL", label: "Toutes" },
  { id: "UNREAD", label: "Non lues" },
  { id: "MESSAGES", label: "Messages" },
  { id: "PROFILE", label: "Profil" },
  { id: "PUBLICATIONS", label: "Publications" },
  { id: "RECOMMENDATIONS", label: "Recommandations" },
  { id: "PLATFORM", label: "Plateforme" }
];

export default function NotificationsPage() {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("ALL");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async (category: NotificationCategory) => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications(category);
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(activeCategory);
  }, [activeCategory]);

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full pb-16 select-none">
      {/* En-tête sans le mot 'RUBRIQUE' */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground flex items-center gap-2">
            Centre de Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded-full">
                {unreadCount} non lues
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Retrouvez en toute clarté l&apos;historique des interactions, messages et mises à jour concernant votre compte.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          leftIcon={<CheckCheck size={15} />}
          className="shrink-0"
        >
          Tout marquer comme lu
        </Button>
      </div>

      <div className="overflow-x-auto pb-1 no-scrollbar">
        <Tabs
          variant="pill"
          tabs={CATEGORY_TABS}
          activeTabId={activeCategory}
          onChange={(id) => setActiveCategory(id as NotificationCategory)}
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-card border border-border/60 rounded-2xl flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
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
          title="Aucune notification dans cette catégorie"
          description="Les activités de votre compte et les messages importants apparaîtront ici."
          action={
            <Button variant="outline" size="sm" onClick={() => setActiveCategory("ALL")}>
              Voir toutes les notifications
            </Button>
          }
        />
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="space-y-6">
          {todayItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Aujourd&apos;hui
              </h3>
              <div className="space-y-2.5">
                {todayItems.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </div>
          )}

          {weekItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Cette semaine
              </h3>
              <div className="space-y-2.5">
                {weekItems.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </div>
          )}

          {olderItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Plus ancien
              </h3>
              <div className="space-y-2.5">
                {olderItems.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
