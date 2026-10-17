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
  Delete02Icon,
  CreditCardNotAcceptIcon
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
  SYSTEM: InformationCircleIcon,
  PAYMENT: CreditCardNotAcceptIcon
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
        "flex items-start gap-3.5 p-4 rounded-[16px] border bg-card transition-colors select-none group relative",
        notification.isRead ? "border-border/50" : "border-accent/35 bg-accent-subtle/40",
        notification.targetUrl && "hover:bg-secondary/40"
      )}
    >
      {/* Avatar de l'auteur (avec pastille d'icône) ou icône de catégorie */}
      {notification.actorAvatar ? (
        <div className="relative shrink-0">
          <Avatar
            size="md"
            src={notification.actorAvatar}
            fallback={notification.actorName ? notification.actorName.charAt(0) : "A"}
          />
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-card border border-border/50 text-primary">
            <HugeIcon icon={iconObj} size={10} />
          </div>
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-accent-subtle text-primary flex items-center justify-center shrink-0">
          <HugeIcon icon={iconObj} size={18} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn("text-sm tracking-tight text-foreground", notification.isRead ? "font-medium" : "font-semibold")}>
            {notification.title}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums shrink-0">
            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Non lu" />}
            {notification.timeLabel}
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{notification.message}</p>

        {/* Marquer comme lu / Supprimer : toujours visibles sur mobile (pas de
            survol sur un écran tactile), au survol sur ordinateur. */}
        <div className="flex items-center gap-1 mt-2 -ml-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              <HugeIcon icon={Tick01Icon} size={13} /> Marquer comme lu
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="inline-flex items-center gap-1 px-1.5 py-1 text-xs text-muted-foreground hover:text-destructive rounded-full transition-colors"
          >
            <HugeIcon icon={Delete02Icon} size={13} /> Supprimer
          </button>
        </div>
      </div>
    </div>
  );

  if (notification.targetUrl) {
    return (
      <Link href={notification.targetUrl} onClick={() => onMarkAsRead(notification.id)} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
