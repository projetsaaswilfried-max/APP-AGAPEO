/**
 * Annonce unique (email + message intégré Agapeo) à TOUS les membres réels
 * du nouveau canal "réserver un appel avec l'équipe" (/reserver-un-appel,
 * page publique, pour que le lien envoyé par email fonctionne sans connexion)
 * — pour tout problème rencontré sur la plateforme (abonnement, compte,
 * soumission de profil...), pas seulement un cas précis. Comptes de test et
 * équipe exclus, comme toutes les campagnes de ce type.
 *
 * Usage :
 *   npx tsx scripts/announce-support-call-booking.ts            (dry-run, aucun envoi)
 *   npx tsx scripts/announce-support-call-booking.ts --execute  (envoi réel)
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "Agapeo <support@agapeo.love>";
// En dur, jamais via process.env : .env.local pointe vers localhost pour le
// développement (NEXT_PUBLIC_SITE_URL=http://localhost:3000) et l'emporterait
// sur n'importe quel fallback, puisque la variable est bel et bien définie —
// cf. feedback_hardcode_prod_url_in_scripts, incident déjà vécu. Ce script
// écrit de vrais liens dans de vrais emails à des milliers de destinataires.
const SITE_URL = "https://www.agapeo.love";
// Page publique dédiée (hors de l'espace connecté) : le lien envoyé par
// email doit amener directement au calendrier sans obliger à se connecter
// d'abord — le souci qui amène quelqu'un ici peut justement être qu'il
// n'arrive plus à se connecter ou à soumettre son profil.
const BOOKING_PATH = "/reserver-un-appel";
// Contenu de la toute première version (lien /support#... exigeant une
// connexion) déjà envoyée à 224 personnes avant correction — sert à ne
// jamais les renvoyer en double lors de la reprise.
const PREVIOUS_MESSAGE_CONTENT =
  "Un souci avec ton abonnement, ton compte, ta soumission de profil... quel que soit le problème que tu rencontres sur Agapeo, tu peux maintenant réserver un appel avec notre équipe, au créneau qui t'arrange, et on le règle ensemble en direct.";

const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";

const EXECUTE = process.argv.includes("--execute");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RESEND_DELAY_MS = 150;

async function sendResendEmail(to: string, subject: string, html: string) {
  const payload = { from: FROM_EMAIL, to: [to], subject, html };
  await sleep(RESEND_DELAY_MS);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status === 429) {
    await sleep(2000);
    const retry = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!retry.ok) throw new Error(`Resend a refusé l'envoi après reprise (${retry.status}) : ${await retry.text()}`);
    return;
  }
  if (!res.ok) throw new Error(`Resend a refusé l'envoi (${res.status}) : ${await res.text()}`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(firstName: string): string {
  const safeName = escapeHtml(firstName || "là");
  const bookingUrl = `${SITE_URL}${BOOKING_PATH}`;
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#be185d;font-weight:600;">SUPPORT</p>
      <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;color:#111827;">Un souci sur Agapeo ? Parlons-en de vive voix</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">Salut ${safeName},</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">
        Un problème avec ton abonnement, ton compte, la soumission de ton profil... ou autre chose ? Tu peux désormais réserver directement
        un appel avec notre équipe, au créneau qui t'arrange, et on règle la situation ensemble en direct.
      </p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#374151;">
        Quel que soit le problème rencontré, c'est fait pour ça : choisis simplement ta disponibilité.
      </p>
      <a href="${bookingUrl}" style="display:inline-block;background:#be185d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">Réserver un appel</a>
      <p style="margin:32px 0 0 0;font-size:12px;color:#9ca3af;">L'équipe Agapeo</p>
    </div>
  `;
}

function buildInAppMessage(): string {
  return "Un souci avec ton abonnement, ton compte, ta soumission de profil... quel que soit le problème que tu rencontres sur Agapeo, tu peux maintenant réserver un appel avec notre équipe, au créneau qui t'arrange, et on le règle ensemble en direct.";
}

async function sendInAppMessage(memberId: string) {
  const { data: existingParticipant } = await admin
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(is_system_broadcast)")
    .eq("user_id", memberId)
    .eq("conversations.is_system_broadcast", true)
    .maybeSingle();

  let conversationId: string;
  if (existingParticipant) {
    conversationId = existingParticipant.conversation_id as string;
  } else {
    const { data: newConversation, error: conversationError } = await admin
      .from("conversations")
      .insert({ is_system_broadcast: true, status: "ACCEPTED" })
      .select("id")
      .single();
    if (conversationError || !newConversation) throw new Error(conversationError?.message ?? "Conversation système introuvable.");
    conversationId = newConversation.id;

    const { error: participantsError } = await admin.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: memberId },
      { conversation_id: conversationId, user_id: AGAPEO_SYSTEM_PROFILE_ID }
    ]);
    if (participantsError) throw new Error(participantsError.message);
  }

  const content = buildInAppMessage();
  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "TEXT",
    content,
    cta_text: "Réserver un appel",
    cta_url: BOOKING_PATH,
    cta_action: "SUPPORT_CALL"
  });
  if (messageError) throw new Error(messageError.message);

  const { error: notifError } = await admin.from("notifications").insert({
    recipient_id: memberId,
    actor_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "NEW_MESSAGE",
    title: "Agapeo vous a envoyé un message",
    body: content.slice(0, 140),
    target_url: `/messages?conversation=${conversationId}`
  });
  if (notifError) throw new Error(notifError.message);
}

interface Candidate {
  id: string;
  first_name: string;
  email: string;
}

/**
 * listUsers plafonne à 1000/page tout comme la lecture de `profiles` —
 * résoudre les emails un par un via getUserById (un appel réseau chacun)
 * serait d'une lenteur disproportionnée sur ~17 000 comptes. On liste les
 * deux côtés en vrac puis on les associe en mémoire.
 */
async function fetchAllCandidates(): Promise<Candidate[]> {
  const emailById = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) emailById.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }

  const candidates: Candidate[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, first_name")
      .eq("is_test_account", false)
      .eq("is_staff", false)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const email = emailById.get(row.id);
      if (email) candidates.push({ id: row.id, first_name: row.first_name ?? "", email });
    }
    if (data.length < pageSize) break;
  }
  return candidates;
}

/**
 * Reprise après correction du lien (224 personnes déjà touchées par la
 * toute première version) : quiconque a déjà reçu l'ancienne OU la nouvelle
 * version du message est ignoré, jamais renvoyé en double.
 */
async function fetchAlreadyAnnouncedIds(): Promise<Set<string>> {
  const { data: msgs, error } = await admin
    .from("messages")
    .select("conversation_id")
    .eq("sender_id", AGAPEO_SYSTEM_PROFILE_ID)
    .in("content", [PREVIOUS_MESSAGE_CONTENT, buildInAppMessage()]);
  if (error) throw error;
  const conversationIds = [...new Set((msgs ?? []).map((m) => m.conversation_id as string))];
  if (conversationIds.length === 0) return new Set();

  const ids = new Set<string>();
  const pageSize = 1000;
  for (let i = 0; i < conversationIds.length; i += pageSize) {
    const batch = conversationIds.slice(i, i + pageSize);
    const { data: participants, error: pErr } = await admin
      .from("conversation_participants")
      .select("user_id")
      .in("conversation_id", batch)
      .neq("user_id", AGAPEO_SYSTEM_PROFILE_ID);
    if (pErr) throw pErr;
    for (const p of participants ?? []) ids.add(p.user_id as string);
  }
  return ids;
}

async function main() {
  console.log(EXECUTE ? "--- EXÉCUTION RÉELLE ---" : "--- DRY RUN (ajoute --execute pour envoyer réellement) ---");

  const allCandidates = await fetchAllCandidates();
  const alreadyAnnounced = EXECUTE ? await fetchAlreadyAnnouncedIds() : new Set<string>();
  const candidates = allCandidates.filter((c) => !alreadyAnnounced.has(c.id));
  console.log(`Destinataires (hors test/équipe) : ${allCandidates.length}`);
  if (alreadyAnnounced.size > 0) console.log(`Déjà annoncés (ignorés, reprise) : ${alreadyAnnounced.size} — restants : ${candidates.length}`);

  if (!EXECUTE) {
    console.log("Aucun envoi effectué (dry-run). Exemple de contenu email pour le premier destinataire :");
    if (candidates[0]) console.log(buildEmailHtml(candidates[0].first_name));
    return;
  }

  let messageOk = 0;
  let messageFail = 0;
  let emailOk = 0;
  let emailFail = 0;

  for (const candidate of candidates) {
    try {
      await sendInAppMessage(candidate.id);
      messageOk++;
    } catch (err) {
      messageFail++;
      console.error(`[message] ${candidate.id} : erreur — ${err instanceof Error ? err.message : err}`);
    }

    try {
      await sendResendEmail(candidate.email, "Un souci sur Agapeo ? Réserve un appel avec notre équipe", buildEmailHtml(candidate.first_name));
      emailOk++;
    } catch (err) {
      emailFail++;
      console.error(`[email] ${candidate.id} : erreur — ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("--- Terminé ---");
  console.log(`Messages intégrés : ${messageOk} envoyés, ${messageFail} échecs`);
  console.log(`Emails : ${emailOk} envoyés, ${emailFail} échecs`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
