"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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
  Delete02Icon,
  ArrowRight01Icon,
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
  const [isExpanded, setIsExpanded] = useState(false);

  // Toucher la notification la déroule (texte complet) et la marque comme lue ;
  // le lien vers la page concernée apparaît alors en dessous.
  const handleToggle = () => {
    setIsExpanded((value) => !value);
    if (!notification.isRead) onMarkAsRead(notification.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle();
        }
      }}
      className={cn(
        "flex items-start gap-3.5 p-4 rounded-[16px] border bg-card transition-colors select-none cursor-pointer",
        notification.isRead ? "border-border/50" : "border-accent/35 bg-accent-subtle/40"
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
          {/* Cercle de taille fixe : sans dimensions explicites, la hauteur de ligne de l'icône l'étirait en ovale vertical. */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border/50 text-primary flex items-center justify-center leading-none">
            <HugeIcon icon={iconObj} size={11} />
          </div>
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-accent-subtle text-primary flex items-center justify-center shrink-0">
          <HugeIcon icon={iconObj} size={18} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn("text-sm tracking-tight text-foreground truncate", notification.isRead ? "font-medium" : "font-semibold")}>
            {notification.title}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums shrink-0">
            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-primary" aria-label="Non lu" />}
            {notification.timeLabel}
          </span>
        </div>

        <div className="flex items-start gap-2 mt-1">
          {/* Replié : une ligne terminée par « … » ; déplié : le texte se déroule (transition de hauteur). */}
          <p
            className={cn(
              "flex-1 min-w-0 text-sm text-muted-foreground leading-relaxed overflow-hidden transition-[max-height] duration-300 ease-out",
              isExpanded ? "max-h-80" : "max-h-[1.65em] line-clamp-1"
            )}
          >
            {notification.message}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            aria-label="Supprimer la notification"
            title="Supprimer"
            className="shrink-0 -mt-0.5 p-1.5 text-muted-foreground/70 hover:text-destructive rounded-full transition-colors"
          >
            <HugeIcon icon={Delete02Icon} size={15} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && notification.targetUrl && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <Link
                href={notification.targetUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 pt-2 text-xs font-semibold text-primary"
              >
                Voir <HugeIcon icon={ArrowRight01Icon} size={13} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
