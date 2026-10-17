/**
 * Migration UNIQUE (à lancer une seule fois) : annonce l'essai Premium
 * gratuit de 24h aux comptes déjà existants avant le lancement de cette
 * fonctionnalité (cf. approveVerificationRequestAction, qui gère désormais
 * les nouvelles validations normalement — ce script ne couvre que le passé).
 *
 * Deux populations, strictement FREE (jamais EXPIRED, ni staff, ni test) :
 *   1) Déjà VERIFIED  -> l'essai démarre immédiatement (mêmes champs que
 *      l'action temps réel) + email + message Agapeo "ton essai a démarré".
 *   2) UNVERIFIED/REJECTED -> aucun essai pour l'instant (il ne démarre qu'à
 *      la validation) : juste un email d'annonce expliquant la nouveauté.
 *
 * Idempotent : relancer ce script ne renvoie jamais rien en double.
 *   - Groupe 1 filtré sur trial_granted_at IS NULL (même marqueur que
 *     l'action temps réel).
 *   - Groupe 2 filtré sur legacy_trial_announcement_sent = false (dédié à CE
 *     script, cf. migration legacy_trial_announcement_column).
 *
 * Usage :
 *   npx tsx scripts/announce-trial-to-existing-users.ts            (dry-run : affiche qui serait concerné, n'envoie rien)
 *   npx tsx scripts/announce-trial-to-existing-users.ts --execute   (envoi réel)
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
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.agapeo.love";
const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";

const isExecute = process.argv.includes("--execute");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function buildEmailHtml(headline: string, contentHtml: string, ctaText: string, ctaUrl: string, firstName: string): string {
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <p style="font-size:11px;letter-spacing:1px;color:#E83E75;font-weight:700;text-transform:uppercase;margin:0 0 8px 0;">AGAPEO</p>
  <h1 style="font-size:20px;color:#1A1D21;margin:0 0 16px 0;">${escapeHtml(headline)}</h1>
  <p style="margin:0 0 12px 0;color:#334155;">Bonjour ${escapeHtml(firstName)},</p>
  ${contentHtml}
  <a href="${ctaUrl}" style="display:inline-block;margin-top:16px;background:#E83E75;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;font-size:14px;">${escapeHtml(ctaText)}</a>
</div>`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resend plafonne à 10 requêtes/seconde (429 constaté en conditions réelles
// sur la séquence existante activation-email-sequences, non modifiée par ce
// script) — 150ms entre chaque envoi reste sous ce plafond avec de la marge
// (~6,6 req/s), et une seule tentative de reprise après une pause plus longue
// en cas de 429 malgré tout (ex: autre process envoyant en parallèle).
const RESEND_DELAY_MS = 150;

async function sendResendEmail(to: string, subject: string, html: string) {
  await sleep(RESEND_DELAY_MS);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Agapeo <support@agapeo.love>", to: [to], subject, html })
  });
  if (res.status === 429) {
    await sleep(2000);
    const retry = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Agapeo <support@agapeo.love>", to: [to], subject, html })
    });
    if (!retry.ok) throw new Error(`Resend a refusé l'envoi après reprise (${retry.status}) : ${await retry.text()}`);
    return;
  }
  if (!res.ok) throw new Error(`Resend a refusé l'envoi (${res.status}) : ${await res.text()}`);
}

async function sendAgapeoSystemMessage(memberId: string, content: string, ctaText: string, ctaUrl: string) {
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
    const { data: newConversation, error } = await admin
      .from("conversations")
      .insert({ is_system_broadcast: true, status: "ACCEPTED" })
      .select("id")
      .single();
    if (error || !newConversation) throw new Error(error?.message ?? "Conversation système introuvable.");
    conversationId = newConversation.id;
    const { error: participantsError } = await admin.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: memberId },
      { conversation_id: conversationId, user_id: AGAPEO_SYSTEM_PROFILE_ID }
    ]);
    if (participantsError) throw new Error(participantsError.message);
  }

  const { error: messageError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: AGAPEO_SYSTEM_PROFILE_ID, type: "TEXT", content, cta_text: ctaText, cta_url: ctaUrl, cta_action: "PREMIUM" });
  if (messageError) throw new Error(messageError.message);

  await admin.from("notifications").insert({
    recipient_id: memberId,
    actor_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "NEW_MESSAGE",
    title: "Agapeo vous a envoyé un message",
    body: content.slice(0, 140),
    target_url: `/messages?conversation=${conversationId}`
  });
}

interface CandidateRow {
  id: string;
  first_name: string;
  photo_verification_status: string;
}

async function fetchCandidates(): Promise<CandidateRow[]> {
  const PAGE_SIZE = 1000;
  const all: CandidateRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, first_name, photo_verification_status, profile_restricted!inner(subscription_status, trial_granted_at, legacy_trial_announcement_sent)")
      .eq("profile_restricted.subscription_status", "FREE")
      .eq("is_test_account", false)
      .eq("is_staff", false)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as (CandidateRow & {
      profile_restricted: { subscription_status: string; trial_granted_at: string | null; legacy_trial_announcement_sent: boolean };
    })[];
    all.push(
      ...rows
        .filter((r) =>
          r.photo_verification_status === "VERIFIED" ? !r.profile_restricted.trial_granted_at : !r.profile_restricted.legacy_trial_announcement_sent
        )
        .map((r) => ({ id: r.id, first_name: r.first_name, photo_verification_status: r.photo_verification_status }))
    );
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function main() {
  const candidates = await fetchCandidates();
  const verified = candidates.filter((c) => c.photo_verification_status === "VERIFIED");
  const unverified = candidates.filter((c) => c.photo_verification_status !== "VERIFIED");

  console.log(`Comptes FREE déjà vérifiés (essai à démarrer) : ${verified.length}`);
  console.log(`Comptes FREE non vérifiés (email d'annonce seul) : ${unverified.length}`);

  if (!isExecute) {
    console.log("\n--- DRY RUN : aucun email envoyé, aucune donnée modifiée ---");
    console.log("Relancer avec --execute pour exécuter réellement cette migration.");
    return;
  }

  console.log("\n--- EXÉCUTION RÉELLE ---");

  let verifiedDone = 0;
  for (const row of verified) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      const email = authUser?.user?.email;
      if (!email) {
        console.error(`[verified] ${row.id} : email introuvable, ignoré`);
        continue;
      }

      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 24 * 60 * 60 * 1000);
      const { error } = await admin
        .from("profile_restricted")
        .update({
          subscription_status: "ACTIVE",
          subscription_plan: "FREE_TRIAL",
          subscription_current_period_end: trialEnd.toISOString(),
          trial_granted_at: trialStart.toISOString(),
          trial_reminder_stage: null
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);

      await sendResendEmail(
        email,
        "Bonne nouvelle : 24h d'accès Premium offertes dès maintenant !",
        buildEmailHtml(
          "24h d'accès Premium offertes, à partir de maintenant",
          `<p style="margin:0 0 12px 0;color:#334155;">Ton profil Agapeo est déjà vérifié — et on t'offre 24h d'accès Premium complet, dès maintenant : consultation illimitée des profils, conversations, favoris, savoir qui s'intéresse à toi, filtres avancés... tout est débloqué.</p><p style="margin:0;color:#334155;">Profites-en vite pour explorer Agapeo pleinement.</p>`,
          "Explorer Agapeo",
          `${SITE_URL}/discover`,
          row.first_name
        )
      );

      await sendAgapeoSystemMessage(
        row.id,
        "Bonne nouvelle ! Ton profil est déjà vérifié, et on t'offre 24h d'accès Premium complet à partir de maintenant : consultation illimitée, conversations, favoris, savoir qui s'intéresse à toi, filtres avancés... tout est débloqué. Profites-en vite !",
        "Explorer Agapeo",
        "/discover"
      );

      verifiedDone++;
      console.log(`[verified] ${row.id} (${row.first_name}) : essai démarré + email + message envoyés`);
    } catch (err) {
      console.error(`[verified] ${row.id} : erreur —`, err instanceof Error ? err.message : err);
    }
  }

  let unverifiedDone = 0;
  for (const row of unverified) {
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      const email = authUser?.user?.email;
      if (!email) {
        console.error(`[unverified] ${row.id} : email introuvable, ignoré`);
        continue;
      }

      await sendResendEmail(
        email,
        "Nouveau sur Agapeo : 24h d'accès Premium offertes dès ta validation",
        buildEmailHtml(
          "24h d'accès Premium offertes dès ta validation",
          `<p style="margin:0 0 12px 0;color:#334155;">Nouveauté sur Agapeo : dès que ton profil sera vérifié par notre équipe, tu recevras 24h d'accès Premium complet et gratuit pour explorer la plateforme sans restriction.</p><p style="margin:0;color:#334155;">Soumets ton profil dès maintenant pour en profiter dès sa validation.</p>`,
          "Soumettre mon profil",
          `${SITE_URL}/onboarding`,
          row.first_name
        )
      );

      const { error } = await admin.from("profile_restricted").update({ legacy_trial_announcement_sent: true }).eq("id", row.id);
      if (error) throw new Error(error.message);

      unverifiedDone++;
      console.log(`[unverified] ${row.id} (${row.first_name}) : email d'annonce envoyé`);
    } catch (err) {
      console.error(`[unverified] ${row.id} : erreur —`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nTerminé : ${verifiedDone}/${verified.length} essais démarrés, ${unverifiedDone}/${unverified.length} annonces envoyées.`);
}

main();
