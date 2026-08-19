// Cron toutes les 30 min : relance par email les membres qui ont un message
// non lu depuis plus de 2h (fenêtre 2h-24h pour éviter de ressusciter de très
// vieux messages après un éventuel incident cron). Un seul email par
// conversation par passage, suivi via messages.reminder_email_sent_at
// (jamais réenvoyé pour un même message).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant — email non envoyé.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend a refusé l'envoi (${res.status}) : ${body}`);
  }
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const twoHoursAgoIso = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const oneDayAgoIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, created_at")
    .neq("status", "READ")
    .is("reminder_email_sent_at", null)
    .is("deleted_at", null)
    .lte("created_at", twoHoursAgoIso)
    .gte("created_at", oneDayAgoIso);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const byConversation = new Map<string, MessageRow[]>();
  for (const row of (pending ?? []) as MessageRow[]) {
    const list = byConversation.get(row.conversation_id) ?? [];
    list.push(row);
    byConversation.set(row.conversation_id, list);
  }

  const results: { conversationId: string; sent: boolean; reason?: string }[] = [];

  for (const [conversationId, rows] of byConversation) {
    const messageIds = rows.map((r) => r.id);
    const latest = rows.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const senderId = latest.sender_id;

    const { data: participants } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    const recipientId = (participants ?? []).map((p: { user_id: string }) => p.user_id).find((id: string) => id !== senderId);

    if (!recipientId) {
      results.push({ conversationId, sent: false, reason: "Destinataire introuvable" });
      continue;
    }

    const [{ data: recipientProfile }, { data: senderProfile }, { data: authUser }] = await Promise.all([
      admin.from("profiles").select("first_name, notify_messages").eq("id", recipientId).single(),
      admin.from("profiles").select("first_name").eq("id", senderId).single(),
      admin.auth.admin.getUserById(recipientId)
    ]);

    if (!recipientProfile?.notify_messages) {
      await admin.from("messages").update({ reminder_email_sent_at: now.toISOString() }).in("id", messageIds);
      results.push({ conversationId, sent: false, reason: "Notifications désactivées" });
      continue;
    }

    const email = authUser?.user?.email;
    if (!email) {
      results.push({ conversationId, sent: false, reason: "Email introuvable" });
      continue;
    }

    const senderName = senderProfile?.first_name ?? "Un membre";
    const count = rows.length;

    try {
      await sendResendEmail(
        email,
        count > 1 ? `${count} messages t'attendent sur Agapeo` : `${senderName} attend ta réponse sur Agapeo`,
        buildAgapeoEmailHtml({
          title: "Message en attente sur Agapeo",
          preheader: "Tu as un message qui attend une réponse",
          eyebrow: "MESSAGE EN ATTENTE",
          headline: count > 1 ? `${count} messages t'attendent` : `${senderName} attend ta réponse`,
          recipientFirstName: recipientProfile.first_name,
          contentHtml: `<p style="margin:0;">${senderName} t'a écrit sur Agapeo et n'a pas encore de réponse. Prends un instant pour lire et répondre.</p>`,
          ctaText: "Répondre maintenant",
          ctaUrl: `${SITE_URL}/messages?conversation=${conversationId}`
        })
      );
      await admin.from("messages").update({ reminder_email_sent_at: now.toISOString() }).in("id", messageIds);
      results.push({ conversationId, sent: true });
    } catch (err) {
      results.push({ conversationId, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(
    JSON.stringify({ conversationsProcessed: byConversation.size, results }),
    { headers: { "Content-Type": "application/json" } }
  );
});
