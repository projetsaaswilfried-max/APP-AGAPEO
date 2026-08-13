"use client";

import React from "react";
import Link from "next/link";
import { AppNotification } from "@/domain/types/notification";
import { Avatar } from "@/components/ui/avatar";
import {
  Message01Icon,
  Mic01Icon,
  File01Icon,
  ViewIcon,
  BookmarkIcon,
  SecurityValidationIcon,
  FavouriteIcon,
  UserGroupIcon,
  Megaphone01Icon,
  InformationCircleIcon,
  Tick01Icon,
  Delete02Icon
} from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/hugeicon";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  MESSAGE: Message01Icon,
  VOICE: Mic01Icon,
  FILE: File01Icon,
  VIEW: ViewIcon,
  FAVORITE: BookmarkIcon,
  VERIFIED: SecurityValidationIcon,
  LIKE: FavouriteIcon,
  COMMENT: Message01Icon,
  RECOMMENDATION: UserGroupIcon,
  ANNOUNCEMENT: Megaphone01Icon,
  SYSTEM: InformationCircleIcon
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete
}: NotificationItemProps) {
  const iconObj = ICON_MAP[notification.iconType] || InformationCircleIcon;

  const content = (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-3xl border transition-all duration-200 select-none group relative shadow-soft",
        notification.isRead
          ? "bg-card border-border/40 text-foreground/80"
          : "bg-accent-subtle/60 border-accent/25 text-foreground"
      )}
    >
      {/* Icone de Catégorie ou Avatar */}
      {notification.actorAvatar ? (
        <div className="relative shrink-0">
          <Avatar
            size="md"
            src={notification.actorAvatar}
            fallback={notification.actorName ? notification.actorName.charAt(0) : "A"}
          />
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-card border border-border/40 text-primary shadow-2xs">
            <HugeIcon icon={iconObj} size={11} />
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-full bg-accent-subtle text-primary border border-accent/20 shrink-0 shadow-2xs">
          <HugeIcon icon={iconObj} size={18} />
        </div>
      )}

      {/* Titre & Description */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground tracking-tight">
              {notification.title}
            </span>
            {!notification.isRead && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" title="Non lu" />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {notification.timeLabel}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {notification.message}
        </p>
      </div>

      {/* Actions au survol : Marquer comme lu / Supprimer */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
            title="Marquer comme lu"
          >
            <HugeIcon icon={Tick01Icon} size={14} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
          title="Supprimer"
        >
          <HugeIcon icon={Delete02Icon} size={14} />
        </button>
      </div>
    </div>
  );

  if (notification.targetUrl) {
    return (
      <Link href={notification.targetUrl} onClick={() => onMarkAsRead(notification.id)}>
        {content}
      </Link>
    );
  }

  return content;
}
