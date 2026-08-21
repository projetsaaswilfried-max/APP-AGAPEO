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
  const { participant, lastMessage, unreadCount, isOnline, isTyping, isFavorite } = conversation;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none group border border-transparent",
        isActive
          ? "bg-accent-subtle text-foreground font-semibold border-accent/30 shadow-soft"
          : "hover:bg-secondary/50 text-foreground/90"
      )}
    >
      {/* Avatar avec indicateur En ligne et Badge */}
      <div className="relative shrink-0">
        <Avatar
          size="md"
          src={participant.avatarUrl}
          fallback={participant.firstName.charAt(0)}
          isVerified={participant.badges.some((b) => b.code === "VERIFIED_FAITH")}
          isOnline={isOnline}
        />
      </div>

      {/* Titre & Aperçu du dernier message */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold tracking-tight text-foreground truncate min-w-0">
              {participant.firstName} {participant.lastName}
            </span>
            {isFavorite && <Pin size={11} className="text-accent shrink-0 fill-current" />}
          </div>
          {lastMessage && (
            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
              {lastMessage.createdAt}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {isTyping ? (
            <span className="text-xs text-accent font-medium italic animate-pulse">
              est en train d&apos;écrire...
            </span>
          ) : (
            <p className="text-xs text-muted-foreground truncate font-normal leading-tight">
              {lastMessage ? lastMessagePreview(lastMessage) : "Nouvelle conversation"}
            </p>
          )}

          {/* Badge Message Non Lu */}
          {unreadCount > 0 && (
            <span className="flex items-center justify-center text-[10px] font-bold text-accent-foreground bg-accent px-1.5 py-0.2 rounded-full min-w-4 h-4 leading-none shrink-0 shadow-2xs">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
