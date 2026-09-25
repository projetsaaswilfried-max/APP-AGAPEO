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
  /** Type MIME complet tel qu'enregistré à l'upload (avec codec, ex. "audio/webm;codecs=opus") — le Content-Type servi par Supabase Storage le tronque parfois, cf. VoiceMessagePlayer. */
  mimeType?: string;
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
  /** Bouton d'action optionnel — réservé aux messages système (Équipe Agapeo). */
  ctaText?: string;
  /** Chemin web (Next.js) — navigation web uniquement. */
  ctaUrl?: string;
  /** Identifiant stable de destination (ex: "PREMIUM") — à utiliser côté mobile plutôt que ctaUrl, conçu pour le web. */
  ctaAction?: string;
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
  /** `true` pour la conversation à sens unique avec le compte système Agapeo — la saisie de message est masquée quel que soit le statut d'abonnement. */
  isSystemBroadcast: boolean;
}
