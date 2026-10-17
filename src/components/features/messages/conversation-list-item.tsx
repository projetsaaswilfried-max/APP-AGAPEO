"use client";

import { ChatMessage, ConversationSummary } from "@/domain/types/message";
import { Avatar } from "@/components/ui/avatar";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
}

/** Aperçu du dernier message — jamais le nom de fichier technique pour les pièces jointes. */
function lastMessagePreview(message: ChatMessage): string {
  switch (message.type) {
    case "IMAGE":
      return "📷 Photo";
    case "VIDEO":
      return "🎥 Vidéo";
    case "DOCUMENT":
      return "📄 Document";
    default:
      return message.content;
  }
}

export function ConversationListItem({
  conversation,
  isActive,
  onSelect
}: ConversationListItemProps) {
  const { participant, lastMessage, unreadCount, isOnline, isTyping, isFavorite, status, initiatedByMe } = conversation;
  const isPendingInvite = status === "PENDING";

  const hasUnread = unreadCount > 0;

  // Mobile : rangée d'une liste groupée (fond blanc commun, séparateurs, cf.
  // messages/page.tsx). Ordinateur : rangée de la colonne de gauche, surlignée
  // quand la discussion est ouverte.
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 px-4 py-3 md:px-3 md:py-2.5 md:rounded-[12px] cursor-pointer transition-colors select-none",
        isActive ? "md:bg-secondary" : "active:bg-secondary/60 md:hover:bg-secondary/50"
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          size="md"
          src={participant.avatarUrl}
          fallback={participant.firstName.charAt(0)}
          isVerified={participant.badges.some((b) => b.code === "VERIFIED_FAITH")}
          isOnline={isOnline}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("text-sm tracking-tight text-foreground truncate min-w-0", hasUnread ? "font-semibold" : "font-medium")}>
              {participant.firstName} {participant.lastName}
            </span>
            {isFavorite && <Pin size={11} className="text-accent shrink-0 fill-current" />}
            {isPendingInvite && !initiatedByMe && (
              <span className="shrink-0 text-[10px] font-semibold text-primary bg-accent-subtle px-1.5 py-0.5 rounded-full">Invitation</span>
            )}
          </div>
          {lastMessage && (
            <span className={cn("text-[11px] shrink-0 tabular-nums", hasUnread ? "text-primary font-semibold" : "text-muted-foreground")}>
              {lastMessage.createdAt}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          {isTyping ? (
            <span className="text-xs text-primary font-medium italic">est en train d&apos;écrire...</span>
          ) : isPendingInvite ? (
            <p className={cn("text-xs truncate", initiatedByMe ? "text-muted-foreground italic" : "text-primary font-medium")}>
              {initiatedByMe ? "Invitation envoyée..." : "Souhaite discuter avec toi"}
            </p>
          ) : (
            <p className={cn("text-xs truncate", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
              {lastMessage ? lastMessagePreview(lastMessage) : "Nouvelle conversation"}
            </p>
          )}

          {hasUnread && (
            <span className="flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary px-1.5 rounded-full min-w-[18px] h-[18px] leading-none shrink-0">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
