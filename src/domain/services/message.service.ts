import { ConversationSummary, ChatMessage, MessageAttachment } from "../types/message";
import { createClient } from "@/lib/supabase/client";
import { uploadMessageFile, getSignedAttachmentUrls, type MessageAttachmentKind } from "@/lib/storage";
import { mapConversationSummary, mapMessageRow, mapAttachmentRow } from "@/domain/mappers/message.mapper";
import { PremiumRequiredError, VerificationRequiredError, isRlsViolation } from "@/domain/errors";
import type {
  ConversationParticipantRow,
  MessageRow,
  MessageAttachmentRow,
  ProfileRow,
  ProfilePhotoRow
} from "@/lib/supabase/database.types";

export type MessageUpdate = Pick<ChatMessage, "id" | "status" | "isRead" | "content" | "deletedAt" | "readAt">;

export interface IMessageService {
  getConversations(): Promise<ConversationSummary[]>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  getOrCreateConversation(otherProfileId: string): Promise<string>;
  sendMessage(conversationId: string, content: string): Promise<ChatMessage>;
  sendFileAttachment(conversationId: string, file: File, kind: "IMAGE" | "VIDEO" | "DOCUMENT"): Promise<ChatMessage>;
  markAsRead(conversationId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  toggleFavoriteConversation(conversationId: string, isFavorite: boolean): Promise<void>;
  /** Masque la conversation de ma propre liste — réapparaît automatiquement au prochain message échangé. */
  hideConversation(conversationId: string): Promise<void>;
  subscribeToConversation(conversationId: string, onMessage: (message: ChatMessage) => void): () => void;
  /** Propage en temps réel les changements de statut (accusés de lecture) et les suppressions. */
  subscribeToMessageUpdates(conversationId: string, onUpdate: (update: MessageUpdate) => void): () => void;
  broadcastTyping(conversationId: string): Promise<void>;
  subscribeToTyping(conversationId: string, onTyping: (userId: string) => void): () => void;
}

/** Un seul canal "typing" réutilisé par conversation — évite d'ouvrir un nouveau canal Realtime à chaque frappe. */
const typingSendChannels = new Map<string, ReturnType<ReturnType<typeof createClient>["channel"]>>();

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée.");
  return user.id;
}

/**
 * `messages_insert` combine en un seul `with check` la condition Premium ET
 * la condition "non bloqué" — Postgres renvoie le même code RLS générique
 * (42501) quelle que soit la cause. On distingue les deux ici pour ne pas
 * afficher "Passe Premium" à quelqu'un qui vient en réalité d'être bloqué.
 */
async function throwSendError(conversationId: string, myId: string): Promise<never> {
  const supabase = createClient();
  const { data: other } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", myId)
    .maybeSingle();

  if (other) {
    // `is_blocked` est SECURITY DEFINER : contourne la RLS de `blocks` (qui
    // ne laisse chacun voir que les blocages qu'il a lui-même initiés) pour
    // détecter aussi le cas où c'est l'AUTRE qui m'a bloqué entre-temps.
    const { data: blocked } = await supabase.rpc("is_blocked", { a: myId, b: other.user_id });
    if (blocked) throw new Error("Tu ne peux plus échanger avec cette personne.");
  }

  throw new PremiumRequiredError("Passe Premium pour répondre à ce message.");
}

async function hydrateMessages(rows: MessageRow[], recipientId: string): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const messageIds = rows.map((r) => r.id);

  const { data: attachmentRows } = await supabase.from("message_attachments").select("*").in("message_id", messageIds);
  const attachments = (attachmentRows ?? []) as MessageAttachmentRow[];

  const paths = attachments.map((a) => a.storage_path);
  const signedUrls = await getSignedAttachmentUrls("message-attachments", paths);

  const attachmentsByMessage = new Map<string, MessageAttachment[]>();
  attachments.forEach((a) => {
    const list = attachmentsByMessage.get(a.message_id) ?? [];
    list.push(mapAttachmentRow(a, signedUrls[a.storage_path]));
    attachmentsByMessage.set(a.message_id, list);
  });

  return rows.map((row) => mapMessageRow(row, recipientId, attachmentsByMessage.get(row.id) ?? []));
}

class MessageServiceSupabase implements IMessageService {
  async getConversations(): Promise<ConversationSummary[]> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { data: myParticipations } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("user_id", myId)
      .is("hidden_at", null);

    const participations = (myParticipations ?? []) as ConversationParticipantRow[];
    if (participations.length === 0) return [];

    const conversationIds = participations.map((p) => p.conversation_id);

    const [{ data: otherParticipants }, { data: lastMessages }, { data: unreadRows }] = await Promise.all([
      supabase.from("conversation_participants").select("*").in("conversation_id", conversationIds).neq("user_id", myId),
      supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id, created_at").in("conversation_id", conversationIds).neq("sender_id", myId)
    ]);

    const otherByConversation = new Map<string, string>();
    (otherParticipants as ConversationParticipantRow[] | null)?.forEach((p) => otherByConversation.set(p.conversation_id, p.user_id));

    const otherProfileIds = [...new Set(otherByConversation.values())];
    const [{ data: profiles }, { data: photos }] = await Promise.all([
      otherProfileIds.length > 0 ? supabase.from("profiles").select("*").in("id", otherProfileIds) : Promise.resolve({ data: [] }),
      otherProfileIds.length > 0 ? supabase.from("profile_photos").select("*").in("profile_id", otherProfileIds) : Promise.resolve({ data: [] })
    ]);

    const profilesById = new Map<string, ProfileRow>((profiles as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos as ProfilePhotoRow[] | null ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });

    const lastMessageByConversation = new Map<string, MessageRow>();
    (lastMessages as MessageRow[] | null ?? []).forEach((m) => {
      if (!lastMessageByConversation.has(m.conversation_id)) lastMessageByConversation.set(m.conversation_id, m);
    });

    const summaries: ConversationSummary[] = [];
    for (const participation of participations) {
      const otherId = otherByConversation.get(participation.conversation_id);
      const otherProfile = otherId ? profilesById.get(otherId) : undefined;
      if (!otherProfile) continue;

      const lastMsgRow = lastMessageByConversation.get(participation.conversation_id);
      const lastMessage = lastMsgRow ? mapMessageRow(lastMsgRow, myId) : undefined;

      const unreadCount = (unreadRows as { conversation_id: string; created_at: string }[] | null ?? []).filter(
        (row) => row.conversation_id === participation.conversation_id && new Date(row.created_at) > new Date(participation.last_read_at)
      ).length;

      summaries.push(
        mapConversationSummary(
          participation.conversation_id,
          otherProfile,
          photosByProfile.get(otherProfile.id) ?? [],
          lastMessage,
          unreadCount,
          participation.is_favorite,
          lastMsgRow?.created_at ?? participation.joined_at
        )
      );
    }

    return summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return hydrateMessages(data as MessageRow[], myId);
  }

  async getOrCreateConversation(otherProfileId: string): Promise<string> {
    const supabase = createClient();
    const myId = await getCurrentUserId();
    if (myId === otherProfileId) throw new Error("Impossible de démarrer une conversation avec soi-même.");

    // Vérifié en amont (message d'erreur précis) plutôt que de laisser la
    // RLS renvoyer une violation générique qu'on ne pourrait pas distinguer
    // d'un blocage Premium.
    const { data: viewerRow } = await supabase.from("profiles").select("photo_verification_status, is_staff").eq("id", myId).single();
    if (viewerRow && viewerRow.photo_verification_status !== "VERIFIED" && !viewerRow.is_staff) {
      throw new VerificationRequiredError("Valide ton profil pour contacter ce membre.");
    }

    const { data: mine } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", myId);
    const myConversationIds = (mine ?? []).map((r) => r.conversation_id);

    if (myConversationIds.length > 0) {
      const { data: existing } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherProfileId)
        .in("conversation_id", myConversationIds)
        .maybeSingle();

      if (existing) return existing.conversation_id;
    }

    const { data: newConversationId, error } = await supabase.rpc("create_conversation_with_participant", {
      other_user_id: otherProfileId
    });
    if (isRlsViolation(error)) throw new PremiumRequiredError();
    if (error || !newConversationId) throw new Error(error?.message ?? "Impossible de créer la conversation.");

    return newConversationId;
  }

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, type: "TEXT", content, status: "SENT" })
      .select()
      .single();

    if (isRlsViolation(error)) await throwSendError(conversationId, myId);
    if (error || !data) throw new Error(error?.message ?? "Le message n'a pas pu être envoyé.");
    return mapMessageRow(data as MessageRow, myId);
  }

  async sendFileAttachment(conversationId: string, file: File, kind: "IMAGE" | "VIDEO" | "DOCUMENT"): Promise<ChatMessage> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { path } = await uploadMessageFile(conversationId, file, kind as MessageAttachmentKind);

    const { data: message, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, type: kind, content: file.name, status: "SENT" })
      .select()
      .single();

    if (isRlsViolation(error)) await throwSendError(conversationId, myId);
    if (error || !message) throw new Error(error?.message ?? "L'envoi a échoué.");

    await supabase.from("message_attachments").insert({
      message_id: message.id,
      type: kind === "DOCUMENT" ? "DOCUMENT" : kind === "VIDEO" ? "VIDEO" : "IMAGE",
      storage_path: path,
      file_name: file.name,
      size_bytes: file.size,
      mime_type: file.type
    });

    const [hydrated] = await hydrateMessages([message as MessageRow], myId);
    return hydrated;
  }

  async markAsRead(conversationId: string): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    // `last_read_at` alimente uniquement MON propre compteur de non-lus —
    // toujours mis à jour, indépendamment du réglage ci-dessous qui ne
    // concerne que ce que L'AUTRE voit de moi.
    await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", myId);

    // "Afficher les confirmations de lecture" (show_read_receipts) : si je
    // l'ai désactivé, l'expéditeur ne doit jamais voir que j'ai lu son
    // message — ce contrôle n'existait pas avant, le statut passait toujours à READ.
    const { data: myProfile } = await supabase.from("profiles").select("show_read_receipts").eq("id", myId).single();
    if (!myProfile?.show_read_receipts) return;

    await supabase
      .from("messages")
      .update({ status: "READ", read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", myId)
      .neq("status", "READ");
  }

  async deleteMessage(messageId: string): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();
    // Filtre applicatif en plus du trigger DB (guard_message_update) qui
    // interdit désormais réellement à un simple participant de supprimer le
    // message de quelqu'un d'autre — défense en profondeur, pas la seule barrière.
    await supabase.from("messages").update({ deleted_at: new Date().toISOString(), content: null }).eq("id", messageId).eq("sender_id", myId);
  }

  async toggleFavoriteConversation(conversationId: string, isFavorite: boolean): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();
    await supabase.from("conversation_participants").update({ is_favorite: isFavorite }).eq("conversation_id", conversationId).eq("user_id", myId);
  }

  async hideConversation(conversationId: string): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();
    await supabase
      .from("conversation_participants")
      .update({ hidden_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", myId);
  }

  subscribeToConversation(conversationId: string, onMessage: (message: ChatMessage) => void): () => void {
    const supabase = createClient();
    let cancelled = false;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          if (cancelled) return;
          const myId = await getCurrentUserId();
          const [hydrated] = await hydrateMessages([payload.new as MessageRow], myId);
          onMessage(hydrated);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }

  async broadcastTyping(conversationId: string): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    let channel = typingSendChannels.get(conversationId);
    if (!channel) {
      channel = supabase.channel(`typing:${conversationId}`);
      channel.subscribe();
      typingSendChannels.set(conversationId, channel);
    }
    await channel.send({ type: "broadcast", event: "typing", payload: { userId: myId } });
  }

  subscribeToTyping(conversationId: string, onTyping: (userId: string) => void): () => void {
    const supabase = createClient();
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        onTyping(payload.payload.userId as string);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      const sendChannel = typingSendChannels.get(conversationId);
      if (sendChannel) {
        supabase.removeChannel(sendChannel);
        typingSendChannels.delete(conversationId);
      }
    };
  }

  subscribeToMessageUpdates(conversationId: string, onUpdate: (update: MessageUpdate) => void): () => void {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-updates:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          onUpdate({
            id: row.id,
            status: row.status,
            isRead: row.status === "READ",
            content: row.content ?? "",
            deletedAt: row.deleted_at ?? undefined,
            readAt: row.read_at ?? undefined
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const messageService = new MessageServiceSupabase();
