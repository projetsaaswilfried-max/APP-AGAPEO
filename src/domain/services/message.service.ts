import { ConversationSummary, ChatMessage, MessageAttachment } from "../types/message";
import { createClient } from "@/lib/supabase/client";
import { uploadMessageFile, getSignedAttachmentUrls, type MessageAttachmentKind } from "@/lib/storage";
import { mapConversationSummary, mapMessageRow, mapAttachmentRow } from "@/domain/mappers/message.mapper";
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
      .eq("user_id", myId);

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

    const { data: conversation, error } = await supabase.from("conversations").insert({}).select().single();
    if (error || !conversation) throw new Error(error?.message ?? "Impossible de créer la conversation.");

    await supabase.from("conversation_participants").insert({ conversation_id: conversation.id, user_id: myId });
    const { error: otherError } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: conversation.id, user_id: otherProfileId });

    if (otherError) throw new Error("Cette personne ne peut pas être contactée actuellement.");

    return conversation.id;
  }

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: myId, type: "TEXT", content, status: "SENT" })
      .select()
      .single();

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

    await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", myId);

    await supabase
      .from("messages")
      .update({ status: "READ", read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", myId)
      .neq("status", "READ");
  }

  async deleteMessage(messageId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from("messages").update({ deleted_at: new Date().toISOString(), content: null }).eq("id", messageId);
  }

  async toggleFavoriteConversation(conversationId: string, isFavorite: boolean): Promise<void> {
    const supabase = createClient();
    const myId = await getCurrentUserId();
    await supabase.from("conversation_participants").update({ is_favorite: isFavorite }).eq("conversation_id", conversationId).eq("user_id", myId);
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
