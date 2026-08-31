import type { MessageRow, MessageAttachmentRow, ProfileRow, ProfilePhotoRow, ConversationStatus } from "@/lib/supabase/database.types";
import type { ChatMessage, MessageAttachment, ConversationSummary } from "@/domain/types/message";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function mapAttachmentRow(row: MessageAttachmentRow, signedUrl?: string): MessageAttachment {
  return {
    id: row.id,
    type: row.type,
    url: signedUrl ?? row.url ?? "",
    name: row.file_name ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    mimeType: row.mime_type ?? undefined
  };
}

export function mapMessageRow(
  row: MessageRow,
  recipientId: string,
  attachments: MessageAttachment[] = []
): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    recipientId,
    content: row.content ?? "",
    type: row.type,
    attachments: attachments.length > 0 ? attachments : undefined,
    status: row.status,
    isRead: row.status === "READ",
    createdAt: formatTime(row.created_at),
    deletedAt: row.deleted_at ?? undefined,
    readAt: row.read_at ?? undefined
  };
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function mapConversationSummary(
  conversationId: string,
  participant: ProfileRow,
  participantPhotos: ProfilePhotoRow[],
  lastMessage: ChatMessage | undefined,
  unreadCount: number,
  isFavorite: boolean,
  updatedAt: string,
  status: ConversationStatus,
  initiatedByMe: boolean
): ConversationSummary {
  // "Afficher mon statut en ligne" (show_online_status) : si désactivé par le
  // participant, ni la présence ni le "vu le..." ne doivent être révélés —
  // ce calcul se faisait avant uniquement sur `last_active_at`, sans jamais
  // consulter ce réglage.
  const isOnline = participant.show_online_status && Date.now() - new Date(participant.last_active_at).getTime() < ONLINE_THRESHOLD_MS;

  return {
    id: conversationId,
    participant: mapProfileRowToUserProfile(participant, participantPhotos),
    lastMessage,
    unreadCount,
    isOnline,
    lastSeen: !participant.show_online_status || isOnline ? undefined : new Date(participant.last_active_at).toLocaleDateString("fr-FR"),
    isFavorite,
    // Volontairement PAS formaté en "HH:MM" ici (contrairement à ChatMessage.createdAt,
    // affiché tel quel) : ce champ ne sert qu'au tri par activité récente
    // (cf. getConversations()) — un format déjà réduit à l'heure du jour
    // triait "23:50" (hier soir) avant "09:15" (ce matin), la conversation
    // active remontait donc rarement en tête de liste.
    updatedAt,
    status,
    initiatedByMe
  };
}
