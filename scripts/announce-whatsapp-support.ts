/**
 * Campagne ciblée : contacte les membres ACTUELLEMENT bloqués pour les
 * rediriger vers le support WhatsApp, avec un message adapté à leur blocage
 * précis (paiement échoué, abonnement expiré, vérification refusée, profil
 * jamais soumis) plutôt qu'un texte générique.
 *
 * Chaque personne ne reçoit qu'UN message : les segments sont évalués par
 * ordre de priorité (l'argent d'abord), et quelqu'un à la fois expiré et
 * refusé n'est contacté que sur le motif le plus bloquant.
 *
 * Idempotence : la présence d'un lien WhatsApp déjà envoyé est revérifiée
 * JUSTE AVANT chaque envoi, et non via un instantané pris au démarrage —
 * c'est exactement ce défaut qui avait provoqué 10 138 doublons lors de la
 * campagne Calendly du 28/10 quand le script a été relancé en cours de route.
 *
 * Usage :
 *   npx tsx scripts/announce-whatsapp-support.ts                      (dry-run)
 *   npx tsx scripts/announce-whatsapp-support.ts --execute
 *   npx tsx scripts/announce-whatsapp-support.ts --execute --segment=PAYMENT_FAILED
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
const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";

// Doit rester synchronisé avec src/config/support.ts.
const WHATSAPP_NUMBER = "18733007552";
const WHATSAPP_DISPLAY = "+1 (873) 300-7552";

const EXECUTE = process.argv.includes("--execute");
const SEGMENT_FILTER = process.argv.find((a) => a.startsWith("--segment="))?.split("=")[1];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RESEND_DELAY_MS = 150;

type Segment = "PAYMENT_FAILED" | "SUBSCRIPTION_EXPIRED" | "VERIFICATION_REJECTED" | "VERIFICATION_STUCK" | "GENERAL";

/**
 * Ordre de priorité : une personne dans plusieurs segments n'est contactée
 * que sur le premier. GENERAL ferme la marche — il ne capte que les membres
 * sans blocage identifié, donc jamais quelqu'un déjà visé par un segment
 * spécifique (les deux campagnes restent ainsi strictement disjointes même
 * lancées l'une après l'autre).
 */
const SEGMENT_PRIORITY: Segment[] = ["PAYMENT_FAILED", "SUBSCRIPTION_EXPIRED", "VERIFICATION_REJECTED", "VERIFICATION_STUCK", "GENERAL"];

const TOPIC_MESSAGES: Record<Segment, string> = {
  PAYMENT_FAILED: "Bonjour, mon paiement n'est pas passé sur Agapeo et je n'ai pas eu accès à l'abonnement.",
  SUBSCRIPTION_EXPIRED: "Bonjour, j'ai une question sur mon abonnement Agapeo.",
  VERIFICATION_REJECTED: "Bonjour, ma vérification de profil a été refusée sur Agapeo et j'aimerais comprendre pourquoi.",
  VERIFICATION_STUCK: "Bonjour, je n'arrive pas à soumettre mon profil pour vérification sur Agapeo.",
  GENERAL: "Bonjour, j'ai besoin d'aide sur Agapeo."
};

function whatsappUrl(segment: Segment): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(TOPIC_MESSAGES[segment])}`;
}

const COPY: Record<Segment, { subject: string; headline: string; eyebrow: string; body: string; inApp: string }> = {
  PAYMENT_FAILED: {
    subject: "Ton paiement Agapeo n'a pas abouti — on le débloque avec toi",
    eyebrow: "PAIEMENT",
    headline: "Ton paiement n'est pas passé",
    body: "Une de tes tentatives de paiement sur Agapeo n'a pas abouti, et ton accès Premium n'a pas été activé. Si tu as malgré tout été débité, ou si le paiement bloque à chaque essai, ne reste pas comme ça : on vérifie ton dossier et on débloque ton accès avec toi.",
    inApp:
      "Ton paiement n'a pas abouti et ton accès Premium n'a pas été activé. Si tu as été débité malgré tout, ou si ça bloque à chaque tentative, écris-nous sur WhatsApp : on vérifie et on débloque ton accès avec toi."
  },
  SUBSCRIPTION_EXPIRED: {
    subject: "Ton abonnement Agapeo a expiré — une question ?",
    eyebrow: "ABONNEMENT",
    headline: "Ton abonnement n'est plus actif",
    body: "Ton abonnement Premium est arrivé à échéance et ton compte est repassé en version gratuite. Si tu as renouvelé sans que l'accès ne revienne, ou si tu as la moindre question sur ton abonnement, écris-nous : on regarde ça tout de suite.",
    inApp:
      "Ton abonnement Premium a expiré et ton compte est repassé en version gratuite. Si tu as renouvelé sans que l'accès revienne, ou si tu as une question, écris-nous sur WhatsApp : on regarde ça tout de suite."
  },
  VERIFICATION_REJECTED: {
    subject: "Ta vérification Agapeo a été refusée — on t'aide à la corriger",
    eyebrow: "VÉRIFICATION",
    headline: "Ta vérification n'a pas été validée",
    body: "Ta demande de vérification de profil n'a pas pu être validée. Si tu ne sais pas quoi corriger exactement, si tu as déjà réessayé sans succès, ou si tu penses qu'il s'agit d'une erreur, écris-nous : on reprend ton dossier avec toi, point par point.",
    inApp:
      "Ta demande de vérification n'a pas pu être validée. Si tu ne sais pas quoi corriger, ou si tu penses qu'il s'agit d'une erreur, écris-nous sur WhatsApp : on reprend ton dossier avec toi, point par point."
  },
  VERIFICATION_STUCK: {
    subject: "Ton profil Agapeo n'est pas encore soumis — un blocage ?",
    eyebrow: "VÉRIFICATION",
    headline: "Ton profil n'est pas encore visible",
    body: "Ton profil n'a pas encore été soumis pour vérification : tant qu'il ne l'est pas, il reste invisible dans Découvrir et personne ne peut te contacter. Si quelque chose bloque (le selfie qui ne passe pas, une étape qui ne se valide pas, une photo refusée...), écris-nous : on débloque ça ensemble.",
    inApp:
      "Ton profil n'est pas encore soumis pour vérification, il reste donc invisible dans Découvrir. Si quelque chose bloque (selfie, photos, une étape qui ne passe pas), écris-nous sur WhatsApp : on débloque ça ensemble."
  },
  GENERAL: {
    subject: "Écris-nous sur WhatsApp si tu as un problème",
    eyebrow: "AIDE",
    headline: "Un problème ? Écris-nous sur WhatsApp",
    body: "Si tu rencontres quoi que ce soit sur Agapeo — un souci d'abonnement ou de paiement, un blocage sur ton profil ou ta vérification, une question sur ton compte — tu peux nous écrire directement sur WhatsApp. On lit ton message et on règle ça avec toi, sans formulaire ni attente.",
    inApp:
      "Un problème sur Agapeo ? Abonnement, paiement, vérification de profil, compte bloqué... quel que soit ton souci, écris-nous directement sur WhatsApp : on lit ton message et on règle ça avec toi."
  }
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(firstName: string, segment: Segment): string {
  const copy = COPY[segment];
  const url = whatsappUrl(segment);
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="margin:0 0 16px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#be185d;font-weight:600;">${copy.eyebrow}</p>
      <h1 style="margin:0 0 20px 0;font-size:22px;line-height:1.3;color:#111827;">${copy.headline}</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#374151;">Salut ${escapeHtml(firstName || "là")},</p>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#374151;">${copy.body}</p>
      <a href="${url}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">Écrire sur WhatsApp</a>
      <p style="margin:16px 0 0 0;font-size:13px;color:#6b7280;">ou enregistre notre numéro : ${WHATSAPP_DISPLAY}</p>
      <p style="margin:32px 0 0 0;font-size:12px;color:#9ca3af;">L'équipe Agapeo</p>
    </div>
  `;
}

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

/** Conversation de diffusion Agapeo du membre (créée si absente). */
async function getOrCreateBroadcastConversation(memberId: string): Promise<string> {
  const { data: existing } = await admin
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(is_system_broadcast)")
    .eq("user_id", memberId)
    .eq("conversations.is_system_broadcast", true)
    .maybeSingle();
  if (existing) return existing.conversation_id as string;

  const { data: created, error } = await admin.from("conversations").insert({ is_system_broadcast: true, status: "ACCEPTED" }).select("id").single();
  if (error || !created) throw new Error(error?.message ?? "Conversation système introuvable.");

  const { error: participantsError } = await admin.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: memberId },
    { conversation_id: created.id, user_id: AGAPEO_SYSTEM_PROFILE_ID }
  ]);
  if (participantsError) throw new Error(participantsError.message);
  return created.id as string;
}

/**
 * Relu juste avant l'envoi (et non en masse au démarrage) : un relancement
 * du script, même en pleine exécution d'un autre, ne peut donc pas produire
 * de doublon.
 */
async function alreadyContacted(conversationId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("sender_id", AGAPEO_SYSTEM_PROFILE_ID)
    .ilike("content", "%wa.me/" + WHATSAPP_NUMBER + "%")
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function sendInAppMessage(conversationId: string, memberId: string, segment: Segment) {
  const content = `${COPY[segment].inApp}\n\n${whatsappUrl(segment)}`;
  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "TEXT",
    content,
    cta_text: "Écrire sur WhatsApp",
    cta_url: whatsappUrl(segment),
    cta_action: "SUPPORT_WHATSAPP"
  });
  if (messageError) throw new Error(messageError.message);

  const { error: notifError } = await admin.from("notifications").insert({
    recipient_id: memberId,
    actor_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "NEW_MESSAGE",
    title: "Agapeo vous a envoyé un message",
    body: COPY[segment].inApp.slice(0, 140),
    target_url: `/messages?conversation=${conversationId}`
  });
  if (notifError) throw new Error(notifError.message);
}

interface Candidate {
  id: string;
  first_name: string;
  email: string;
  segment: Segment;
}

async function fetchAllPages<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}

/** Accepte l'objet (ce que renvoie réellement PostgREST sur cette relation 1-1) comme le tableau (ce que dit le typage). */
function readSubscriptionStatus(embedded: { subscription_status: string }[] | { subscription_status: string } | null): string {
  if (!embedded) return "FREE";
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  return row?.subscription_status ?? "FREE";
}

async function buildCandidates(): Promise<Candidate[]> {
  // Emails en vrac (listUsers plafonne à 1000/page) plutôt qu'un getUserById par personne.
  const emailById = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) emailById.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }

  // Profils réels uniquement, avec leur état d'abonnement et de vérification.
  // `profile_restricted` est typé en tableau par le client Supabase mais
  // arrive en OBJET à l'exécution (relation 1-1 via clé primaire partagée) —
  // lu via readSubscriptionStatus ci-dessous, qui accepte les deux formes.
  const profiles = await fetchAllPages<{
    id: string;
    first_name: string | null;
    photo_verification_status: string;
    onboarding_completed: boolean;
    profile_restricted: { subscription_status: string }[] | { subscription_status: string } | null;
  }>((from, to) =>
    admin
      .from("profiles")
      .select("id, first_name, photo_verification_status, onboarding_completed, profile_restricted(subscription_status)")
      .eq("is_test_account", false)
      .eq("is_staff", false)
      .range(from, to)
  );

  const failedPayers = new Set(
    (
      await fetchAllPages<{ user_id: string }>((from, to) => admin.from("transactions").select("user_id").eq("status", "FAILED").range(from, to))
    ).map((t) => t.user_id)
  );

  const candidates: Candidate[] = [];
  for (const p of profiles) {
    const email = emailById.get(p.id);
    if (!email) continue;
    const subStatus = readSubscriptionStatus(p.profile_restricted);

    let segment: Segment | null = null;
    // Priorité : l'argent d'abord, puis l'accès au produit.
    if (failedPayers.has(p.id) && subStatus !== "ACTIVE") segment = "PAYMENT_FAILED";
    else if (subStatus === "EXPIRED") segment = "SUBSCRIPTION_EXPIRED";
    else if (p.photo_verification_status === "REJECTED") segment = "VERIFICATION_REJECTED";
    else if (p.photo_verification_status === "UNVERIFIED" && p.onboarding_completed) segment = "VERIFICATION_STUCK";
    else segment = "GENERAL";

    if (!segment) continue;
    if (SEGMENT_FILTER && segment !== SEGMENT_FILTER) continue;
    candidates.push({ id: p.id, first_name: p.first_name ?? "", email, segment });
  }

  // Les segments les plus urgents traités en premier : si l'exécution est
  // interrompue, ce sont les dossiers "argent" qui ont déjà été couverts.
  candidates.sort((a, b) => SEGMENT_PRIORITY.indexOf(a.segment) - SEGMENT_PRIORITY.indexOf(b.segment));
  return candidates;
}

async function main() {
  console.log(EXECUTE ? "--- EXÉCUTION RÉELLE ---" : "--- DRY RUN (ajoute --execute pour envoyer réellement) ---");
  if (SEGMENT_FILTER) console.log(`Filtre de segment : ${SEGMENT_FILTER}`);

  const candidates = await buildCandidates();
  const bySegment = new Map<Segment, number>();
  for (const c of candidates) bySegment.set(c.segment, (bySegment.get(c.segment) ?? 0) + 1);

  console.log(`Total à contacter : ${candidates.length}`);
  for (const s of SEGMENT_PRIORITY) if (bySegment.get(s)) console.log(`  ${s} : ${bySegment.get(s)}`);

  if (!EXECUTE) {
    const sample = candidates[0];
    if (sample) {
      console.log(`\nExemple (${sample.segment}) — message intégré :`);
      console.log(`${COPY[sample.segment].inApp}\n${whatsappUrl(sample.segment)}`);
      console.log(`\nSujet email : ${COPY[sample.segment].subject}`);
    }
    return;
  }

  let sent = 0;
  let skipped = 0;
  let messageFail = 0;
  let emailFail = 0;

  for (const candidate of candidates) {
    let conversationId: string;
    try {
      conversationId = await getOrCreateBroadcastConversation(candidate.id);
      if (await alreadyContacted(conversationId)) {
        skipped++;
        continue;
      }
      await sendInAppMessage(conversationId, candidate.id, candidate.segment);
    } catch (err) {
      messageFail++;
      console.error(`[message] ${candidate.id} (${candidate.segment}) : ${err instanceof Error ? err.message : err}`);
      continue;
    }

    try {
      await sendResendEmail(candidate.email, COPY[candidate.segment].subject, buildEmailHtml(candidate.first_name, candidate.segment));
    } catch (err) {
      emailFail++;
      console.error(`[email] ${candidate.id} (${candidate.segment}) : ${err instanceof Error ? err.message : err}`);
    }
    sent++;
    if (sent % 100 === 0) console.log(`... ${sent} traités`);
  }

  console.log("--- Terminé ---");
  console.log(`Contactés : ${sent} | Déjà contactés (ignorés) : ${skipped} | Échecs message : ${messageFail} | Échecs email : ${emailFail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
