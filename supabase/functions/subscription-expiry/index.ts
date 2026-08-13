// Cron quotidien : repasse en EXPIRED les abonnements Premium dont la période
// payée (subscription_current_period_end) est dépassée (email de retrait à la
// clé), et relance par email les membres à 5, 3 puis 1 jour de l'échéance —
// un seul envoi par palier et par cycle, suivi via subscription_reminder_stage
// (remis à NULL par le webhook Chariow à chaque renouvellement réussi).
// Chariow n'a pas de facturation récurrente — c'est cette fonction qui simule
// la fin d'un cycle d'abonnement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Du plus proche au plus loin de l'échéance — .find() doit renvoyer le palier
// le PLUS URGENT applicable (le plus petit nombre de jours restants qui
// borne encore daysLeft), donc l'ordre croissant est indispensable ici.
const REMINDER_MILESTONES = [1, 3, 5];

interface ProfileRestrictedRow {
  id: string;
  subscription_current_period_end: string | null;
  subscription_reminder_stage: number | null;
}

interface ExpiredProfileRestrictedRow {
  id: string;
  subscription_expired_at: string | null;
}

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

// Purement informatif — pas de bouton de paiement : tant que l'accès est
// encore actif côté Chariow, un nouvel achat du même produit est refusé
// (already_purchased, cf. memory chariow_repurchase_block.md). Le
// réabonnement ne redevient possible qu'une fois l'accès réellement retiré
// (cf. sendExpiredEmail), qui porte alors le vrai bouton "Se réabonner".
async function sendReminderEmail(to: string, firstName: string, daysLeft: number) {
  const dayLabel = daysLeft === 1 ? "demain" : `dans ${daysLeft} jours`;
  await sendResendEmail(
    to,
    "Ton abonnement Premium Agapeo expire bientôt",
    buildAgapeoEmailHtml({
      title: "Ton abonnement Premium expire bientôt",
      preheader: `Il te reste ${daysLeft} jour(s) d'accès Premium`,
      eyebrow: "PREMIUM",
      headline: "Ton accès Premium arrive à échéance",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin: 0 0 12px 0;">
          Ton abonnement Premium Agapeo se termine ${dayLabel}. Sans renouvellement, ton compte repassera
          automatiquement en version gratuite — on t'enverra un email dès que ce sera le cas, avec la marche
          à suivre pour te réabonner.
        </p>
      `
    })
  );
}

async function sendExpiredEmail(to: string, firstName: string) {
  await sendResendEmail(
    to,
    "Ton accès Premium n'est plus actif",
    buildAgapeoEmailHtml({
      title: "Ton accès Premium n'est plus actif",
      eyebrow: "PREMIUM",
      headline: "Ton abonnement a expiré",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">Ton abonnement Premium Agapeo est arrivé à échéance et n'a pas été renouvelé à temps — ton compte est repassé en version gratuite.</p>
        <p style="margin:0;">Tu peux te réabonner à tout moment pour retrouver tous tes avantages : contact en priorité, favoris, qui s'intéresse à toi, filtres avancés et consultation illimitée.</p>
      `,
      ctaText: "Se réabonner",
      ctaUrl: `${SITE_URL}/premium`
    })
  );
}

// Deuxième et dernière relance, 24h après le retrait — même bouton "Se
// réabonner" que sendExpiredEmail, ton plus insistant.
async function sendExpiryFollowupEmail(to: string, firstName: string) {
  await sendResendEmail(
    to,
    "On te garde une place — reviens sur Agapeo",
    buildAgapeoEmailHtml({
      title: "On te garde une place sur Agapeo",
      eyebrow: "PREMIUM",
      headline: "Ton accès Premium t'attend",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">Depuis hier, ton compte Agapeo est repassé en version gratuite faute de renouvellement.</p>
        <p style="margin:0;">Réabonne-toi dès maintenant pour retrouver tous tes avantages Premium : contact en priorité, favoris, qui s'intéresse à toi, filtres avancés et consultation illimitée.</p>
      `,
      ctaText: "Se réabonner",
      ctaUrl: `${SITE_URL}/premium`
    })
  );
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const nowIso = now.toISOString();
  const furthestMilestoneIso = new Date(now.getTime() + Math.max(...REMINDER_MILESTONES) * 24 * 60 * 60 * 1000).toISOString();

  // 1) Downgrade des abonnements réellement expirés + email de retrait.
  const { data: expired, error: expiredErr } = await admin
    .from("profile_restricted")
    .update({
      subscription_status: "EXPIRED",
      subscription_plan: null,
      subscription_reminder_stage: null,
      subscription_expired_at: nowIso,
      subscription_expiry_followup_sent: false
    })
    .eq("subscription_status", "ACTIVE")
    .lt("subscription_current_period_end", nowIso)
    .select("id");

  if (expiredErr) {
    return new Response(JSON.stringify({ error: expiredErr.message }), { status: 500 });
  }

  const expiredResults: { userId: string; emailed: boolean; reason?: string }[] = [];
  for (const row of (expired ?? []) as { id: string }[]) {
    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", row.id).single();
    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;

    if (!email) {
      expiredResults.push({ userId: row.id, emailed: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendExpiredEmail(email, profile?.first_name ?? "Membre");
      expiredResults.push({ userId: row.id, emailed: true });
    } catch (err) {
      expiredResults.push({ userId: row.id, emailed: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  // 2) Relances à 5, 3 puis 1 jour de l'échéance — un seul envoi par palier.
  const { data: dueForReminder, error: reminderErr } = await admin
    .from("profile_restricted")
    .select("id, subscription_current_period_end, subscription_reminder_stage")
    .eq("subscription_status", "ACTIVE")
    .lte("subscription_current_period_end", furthestMilestoneIso)
    .gt("subscription_current_period_end", nowIso);

  if (reminderErr) {
    return new Response(JSON.stringify({ error: reminderErr.message }), { status: 500 });
  }

  const reminderResults: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];

  for (const row of (dueForReminder ?? []) as ProfileRestrictedRow[]) {
    if (!row.subscription_current_period_end) continue;

    const daysLeft = Math.ceil((new Date(row.subscription_current_period_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const applicableMilestone = REMINDER_MILESTONES.find((m) => daysLeft <= m);
    if (applicableMilestone === undefined) continue;

    const alreadySent = row.subscription_reminder_stage !== null && row.subscription_reminder_stage <= applicableMilestone;
    if (alreadySent) continue;

    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", row.id).single();
    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;

    if (!email) {
      reminderResults.push({ userId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendReminderEmail(email, profile?.first_name ?? "Membre", Math.max(1, daysLeft));
      await admin.from("profile_restricted").update({ subscription_reminder_stage: applicableMilestone }).eq("id", row.id);
      reminderResults.push({ userId: row.id, sent: true, stage: applicableMilestone });
    } catch (err) {
      reminderResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  // 3) Relance à 24h après le retrait, si toujours pas réabonné — un seul envoi.
  const followupThresholdIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: dueForFollowup, error: followupErr } = await admin
    .from("profile_restricted")
    .select("id, subscription_expired_at")
    .eq("subscription_status", "EXPIRED")
    .eq("subscription_expiry_followup_sent", false)
    .lte("subscription_expired_at", followupThresholdIso);

  if (followupErr) {
    return new Response(JSON.stringify({ error: followupErr.message }), { status: 500 });
  }

  const followupResults: { userId: string; sent: boolean; reason?: string }[] = [];

  for (const row of (dueForFollowup ?? []) as ExpiredProfileRestrictedRow[]) {
    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", row.id).single();
    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;

    if (!email) {
      followupResults.push({ userId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendExpiryFollowupEmail(email, profile?.first_name ?? "Membre");
      await admin.from("profile_restricted").update({ subscription_expiry_followup_sent: true }).eq("id", row.id);
      followupResults.push({ userId: row.id, sent: true });
    } catch (err) {
      followupResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(
    JSON.stringify({
      expiredCount: (expired ?? []).length,
      expiredEmails: expiredResults,
      reminders: reminderResults,
      followups: followupResults
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
