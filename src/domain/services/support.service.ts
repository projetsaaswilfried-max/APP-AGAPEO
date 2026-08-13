import { createClient } from "@/lib/supabase/client";
import { uploadSupportImage, getSignedAttachmentUrls } from "@/lib/storage";
import type { SupportMessageRow, SupportTicketRow, SupportTicketStatus } from "@/lib/supabase/database.types";

export interface SupportMessage {
  id: string;
  ticketId: string;
  userId: string;
  authorId: string;
  isStaff: boolean;
  content: string;
  attachmentUrl?: string;
  attachmentMimeType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: SupportTicketStatus;
  lastMessageAt: string;
  createdAt: string;
  closedAt: string | null;
  closedBy: string | null;
}

export interface SupportTicketSummary extends SupportTicket {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  lastMessage: SupportMessage | null;
  unreadCount: number;
}

function mapMessageRow(row: SupportMessageRow, attachmentUrl?: string): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    authorId: row.author_id,
    isStaff: row.is_staff,
    content: row.content,
    attachmentUrl,
    attachmentMimeType: row.attachment_mime_type ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at
  };
}

/** Résout les chemins de stockage des pièces jointes en URLs signées (jamais stockées telles quelles). */
async function hydrateMessageAttachments(rows: SupportMessageRow[]): Promise<SupportMessage[]> {
  const paths = rows.map((r) => r.attachment_path).filter((p): p is string => Boolean(p));
  const signedUrls = paths.length > 0 ? await getSignedAttachmentUrls("support-attachments", paths) : {};
  return rows.map((row) => mapMessageRow(row, row.attachment_path ? signedUrls[row.attachment_path] : undefined));
}

function mapTicketRow(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    closedBy: row.closed_by
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée.");
  return user.id;
}

/**
 * Service support organisé autour de "dossiers" (support_tickets) : un membre
 * n'a qu'un seul dossier OUVERT à la fois (contrainte DB), peut échanger des
 * messages tant qu'il est ouvert, et doit en ouvrir un nouveau une fois
 * l'ancien clôturé. La RLS est la vraie barrière — ce service construit les
 * bons appels des deux côtés (membre / staff).
 */
class SupportServiceSupabase {
  /**
   * Ouvre un nouveau dossier (objet + premier message, avec image optionnelle).
   * En deux temps — le dossier doit exister avant qu'une image puisse être
   * uploadée dedans (le chemin de stockage est scopé par ticket_id, vérifié
   * par la RLS du bucket) : si l'envoi du premier message échoue après la
   * création du dossier, celui-ci reste ouvert et vide — pas une impasse,
   * l'utilisateur y retrouve juste un dossier prêt à recevoir son message.
   */
  async openTicket(subject: string, message: string, image?: File): Promise<string> {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject) throw new Error("L'objet est obligatoire.");
    if (!trimmedMessage && !image) throw new Error("Ajoute un message ou une image.");

    const supabase = createClient();
    const myId = await getCurrentUserId();

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({ user_id: myId, subject: trimmedSubject })
      .select()
      .single();
    if (ticketError || !ticket) throw new Error(ticketError?.message ?? "Le dossier n'a pas pu être créé.");

    const ticketRef = { id: (ticket as SupportTicketRow).id, userId: myId };
    if (image) {
      await this.sendImageMessage(ticketRef, image, false, trimmedMessage);
    } else {
      await this.sendMessage(ticketRef, trimmedMessage, false);
    }

    return ticketRef.id;
  }

  /** Le dossier ouvert du membre courant, s'il y en a un (RLS : réservé à son propre id). */
  async getMyOpenTicket(): Promise<SupportTicket | null> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", userId).eq("status", "OPEN").maybeSingle();
    return data ? mapTicketRow(data as SupportTicketRow) : null;
  }

  /** Historique complet des dossiers du membre courant (ouverts + clôturés), plus récents en premier. */
  async getMyTickets(): Promise<SupportTicket[]> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    return ((data ?? []) as SupportTicketRow[]).map(mapTicketRow);
  }

  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    const supabase = createClient();
    const { data } = await supabase.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    return data ? mapTicketRow(data as SupportTicketRow) : null;
  }

  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    const supabase = createClient();
    const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    return hydrateMessageAttachments((data ?? []) as SupportMessageRow[]);
  }

  async sendMessage(ticket: Pick<SupportTicket, "id" | "userId">, content: string, isStaffReply: boolean): Promise<SupportMessage> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error("Le message ne peut pas être vide.");

    const supabase = createClient();
    const myId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticket.id, user_id: ticket.userId, author_id: myId, is_staff: isStaffReply, content: trimmed })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Le message n'a pas pu être envoyé.");
    return mapMessageRow(data as SupportMessageRow);
  }

  /** Envoie une image (avec légende optionnelle) dans un dossier ouvert. */
  async sendImageMessage(
    ticket: Pick<SupportTicket, "id" | "userId">,
    file: File,
    isStaffReply: boolean,
    caption = ""
  ): Promise<SupportMessage> {
    const { path } = await uploadSupportImage(ticket.id, file);

    const supabase = createClient();
    const myId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        ticket_id: ticket.id,
        user_id: ticket.userId,
        author_id: myId,
        is_staff: isStaffReply,
        content: caption.trim(),
        attachment_path: path,
        attachment_mime_type: file.type
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "L'image n'a pas pu être envoyée.");
    const [hydrated] = await hydrateMessageAttachments([data as SupportMessageRow]);
    return hydrated;
  }

  /** Clôture un dossier — accessible au membre propriétaire comme au staff. */
  async closeTicket(ticketId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("support_tickets").update({ status: "CLOSED" }).eq("id", ticketId);
    if (error) throw new Error(error.message || "Ce dossier n'a pas pu être clôturé.");
  }

  /** Marque comme lus les messages de l'AUTRE partie dans ce dossier (jamais ses propres messages). */
  async markTicketRead(ticketId: string, viewerIsStaff: boolean): Promise<void> {
    const supabase = createClient();
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("ticket_id", ticketId)
      .eq("is_staff", !viewerIsStaff)
      .eq("is_read", false);
  }

  /** Réservé au staff : tous les dossiers (optionnellement filtrés par statut), triés par activité récente. */
  async getAllTickets(status?: SupportTicketStatus): Promise<SupportTicketSummary[]> {
    const supabase = createClient();
    let query = supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data: tickets } = await query;

    const rows = (tickets ?? []) as SupportTicketRow[];
    if (rows.length === 0) return [];

    const ticketIds = rows.map((t) => t.id);
    const userIds = [...new Set(rows.map((t) => t.user_id))];

    const [{ data: profiles }, { data: messages }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", userIds),
      supabase.from("support_messages").select("*").in("ticket_id", ticketIds).order("created_at", { ascending: true })
    ]);

    type ProfileLite = { id: string; first_name: string; last_name: string; avatar_url: string | null };
    const profileById = new Map(((profiles ?? []) as ProfileLite[]).map((p) => [p.id, p]));

    const lastByTicket = new Map<string, SupportMessageRow>();
    const unreadByTicket = new Map<string, number>();
    for (const row of (messages ?? []) as SupportMessageRow[]) {
      lastByTicket.set(row.ticket_id, row);
      if (!row.is_staff && !row.is_read) unreadByTicket.set(row.ticket_id, (unreadByTicket.get(row.ticket_id) ?? 0) + 1);
    }

    return rows.map((t) => {
      const profile = profileById.get(t.user_id);
      const last = lastByTicket.get(t.id);
      return {
        ...mapTicketRow(t),
        firstName: profile?.first_name ?? "Membre",
        lastName: profile?.last_name ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        lastMessage: last ? mapMessageRow(last) : null,
        unreadCount: unreadByTicket.get(t.id) ?? 0
      };
    });
  }

  async getOpenTicketsCount(): Promise<number> {
    const supabase = createClient();
    const { count } = await supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "OPEN");
    return count ?? 0;
  }

  subscribeToTicket(ticketId: string, onMessage: (message: SupportMessage) => void): () => void {
    const supabase = createClient();
    const channel = supabase
      .channel(`support-ticket:${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` },
        async (payload) => {
          const [hydrated] = await hydrateMessageAttachments([payload.new as SupportMessageRow]);
          onMessage(hydrated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supportService = new SupportServiceSupabase();
