import { UserProfile } from "./user";

export type MessageType = "TEXT" | "VOICE" | "IMAGE" | "VIDEO" | "DOCUMENT" | "SYSTEM";
export type MessageStatus = "SENDING" | "SENT" | "DELIVERED" | "READ";

export interface MessageAttachment {
  id: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  url: string;
  name?: string;
  sizeBytes?: number;
  durationSeconds?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  isRead: boolean;
  createdAt: string;
  dateLabel?: string;
  deletedAt?: string;
  readAt?: string;
}

export interface ConversationSummary {
  id: string;
  participant: UserProfile;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
  lastSeen?: string;
  isTyping?: boolean;
  isFavorite?: boolean;
  updatedAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  /** `true` si c'est moi qui ai envoyé l'invitation — détermine "en attente" vs bannière à répondre quand status = PENDING. */
  initiatedByMe: boolean;
}
