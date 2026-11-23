import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSupportAgent, FALLBACK_REPLY, type SupportAgentTurn } from "@/lib/support-agent/run";
import { executeSupportTool, SYSTEM_ACCOUNT_ID } from "@/lib/support-agent/tools";
import { IS_SUPPORT_AGENT_ENABLED } from "@/config/support-agent";

/**
 * Un tour de conversation avec l'assistant de support.
 *
 * Le message du membre et la réponse de l'assistant sont écrits dans les
 * dossiers existants (`support_tickets` / `support_messages`) : le déclencheur
 * `support_messages_notify_reply` prévient donc déjà le membre (cloche + push)
 * et l'inbox d'administration voit tout l'échange sans rien de nouveau à
 * brancher.
 *
 * Deux garanties que la route doit tenir quoi qu'il arrive :
 *
 *  1. Le message du membre est enregistré AVANT d'appeler l'assistant. Si
 *     l'assistant échoue, la demande n'est jamais perdue.
 *  2. Un membre n'est jamais laissé sans réponse : en cas d'échec, le dossier
 *     est transmis à l'équipe et le membre en est informé.
 *
 * Quand un dossier a déjà été transmis, l'assistant se tait : un humain tient
 * la conversation, l'assistant ne doit pas répondre par-dessus lui.
 */

/**
 * L'assistant peut enchaîner des appels d'outils : il faut lui en laisser le
 * temps. 60 s reste dans la limite de tous les forfaits Vercel ; à relever si
 * le projet passe sur un forfait qui l'autorise.
 */
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  if (!IS_SUPPORT_AGENT_ENABLED) {
    return NextResponse.json({ error: "L'assistant n'est pas encore ouvert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
  }

  let body: { ticketId?: string | null; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message vide." }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).` }, { status: 400 });
  }

  const admin = createAdminClient();

  // --- Dossier : celui en cours, ou un nouveau. Toujours vérifié comme
  // appartenant au demandeur, jamais pris sur sa parole. ---
  let ticketId = body.ticketId ?? null;
  if (ticketId) {
    const { data: existing } = await admin.from("support_tickets").select("id, user_id, status").eq("id", ticketId).maybeSingle();
    if (!existing || existing.user_id !== user.id || existing.status !== "OPEN") ticketId = null;
  }
  if (!ticketId) {
    const { data: open } = await admin
      .from("support_tickets")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "OPEN")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    ticketId = open?.id ?? null;
  }
  if (!ticketId) {
    const { data: created, error: createError } = await admin
      .from("support_tickets")
      .insert({ user_id: user.id, subject: message.slice(0, 80) })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: "Impossible d'ouvrir ton dossier, réessaie." }, { status: 500 });
    }
    ticketId = created.id;
  }

  if (!ticketId) {
    return NextResponse.json({ error: "Impossible d'ouvrir ton dossier, réessaie." }, { status: 500 });
  }
  const resolvedTicketId: string = ticketId;

  // --- Le message du membre est enregistré d'abord, sans condition. ---
  const { data: memberMessage, error: insertError } = await admin
    .from("support_messages")
    .insert({ ticket_id: ticketId, user_id: user.id, author_id: user.id, is_staff: false, content: message })
    .select("id, created_at")
    .single();
  if (insertError || !memberMessage) {
    return NextResponse.json({ error: "Message non enregistré, réessaie." }, { status: 500 });
  }

  const { data: ticket } = await admin.from("support_tickets").select("escalated_at").eq("id", ticketId).maybeSingle();

  // Dossier déjà entre les mains de l'équipe : l'assistant ne parle plus.
  if (ticket?.escalated_at) {
    return NextResponse.json({
      ticketId,
      memberMessageId: memberMessage.id,
      reply: null,
      handedOver: true
    });
  }

  // --- Historique complet du dossier pour l'assistant. ---
  const { data: history } = await admin
    .from("support_messages")
    .select("content, is_staff")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
    .limit(60);

  const turns: SupportAgentTurn[] = (history ?? []).map((row) => ({
    role: row.is_staff ? "agent" : "member",
    content: row.content
  }));

  let reply: string;
  let escalated = false;
  try {
    const result = await runSupportAgent({ userId: user.id, ticketId: resolvedTicketId }, turns);
    reply = result.reply;
    escalated = result.escalated;
  } catch (err) {
    // Jamais de silence : on transmet et on le dit au membre.
    console.error(`[support-agent] ticket ${ticketId} :`, err instanceof Error ? err.message : err);
    await executeSupportTool(
      { userId: user.id, ticketId: resolvedTicketId },
      "transmettre_a_l_equipe",
      {
        resume:
          "L'assistant n'a pas pu répondre (indisponibilité technique). Dernier message du membre :\n\n" + message.slice(0, 1500),
        categorie: "BUG"
      }
    );
    reply = FALLBACK_REPLY;
    escalated = true;
  }

  // --- Réponse écrite dans le dossier, signée « Équipe Agapeo ». ---
  const { data: agentMessage } = await admin
    .from("support_messages")
    .insert({ ticket_id: ticketId, user_id: user.id, author_id: SYSTEM_ACCOUNT_ID, is_staff: true, content: reply })
    .select("id, created_at")
    .single();

  return NextResponse.json({
    ticketId,
    memberMessageId: memberMessage.id,
    agentMessageId: agentMessage?.id ?? null,
    reply,
    escalated
  });
}
