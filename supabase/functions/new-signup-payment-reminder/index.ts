// Cron toutes les 5 minutes : relance une nouvelle inscription qui n'a pas
// encore payé les 4 083 FCFA d'accès (paywall pré-onboarding, cf. migration
// new_signup_payment_required) — 6 paliers : 10 minutes, J+1, J+2, J+3, J+4,
// J+5 après profiles.created_at. Un seul envoi par palier et par compte,
// suivi via profile_restricted.access_payment_reminder_stage — même principe
// que onboarding_sequence_stage / premium_sequence_stage.
//
// `subscription_current_period_end IS NULL` est une condition indispensable,
// pas juste une optimisation : sans elle, un compte qui a payé une fois puis
// dont l'accès a fini par expirer (des mois plus tard) recevrait à tort "tu
// n'as toujours pas payé pour finir ton inscription", alors que son cas
// relève uniquement de la restriction EXPIRED, ailleurs dans l'app. Cette
// colonne n'est posée qu'une seule fois, au tout premier paiement réussi
// (cf. chariow-webhook-handler.ts), et n'est jamais remise à null par le cron
// d'expiration — elle distingue donc de façon fiable et permanente "n'a
// jamais payé" de "a payé un jour, a fini par expirer".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Doit rester synchronisé avec PREMIUM_PLANS.ACCESS dans src/domain/premium-plans.ts
// (runtime Deno isolé de l'app Next.js, aucun module partageable entre les deux).
const PRICE_LABEL = "4 083 FCFA";
const CTA_URL = `${SITE_URL}/login?redirectTo=/payment-required`;

// Index = palier. En minutes pour pouvoir exprimer "10 minutes" comme J+1..J+5.
const MILESTONES_MINUTES = [10, 24 * 60, 2 * 24 * 60, 3 * 24 * 60, 4 * 24 * 60, 5 * 24 * 60];

interface CandidateRow {
  id: string;
  first_name: string;
  created_at: string;
  profile_restricted: {
    subscription_status: string;
    subscription_current_period_end: string | null;
    access_payment_reminder_stage: number | null;
  };
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

function applicableStage(minutesSince: number): number | undefined {
  // Le plus grand palier déjà atteint.
  for (let i = MILESTONES_MINUTES.length - 1; i >= 0; i--) {
    if (minutesSince >= MILESTONES_MINUTES[i]) return i;
  }
  return undefined;
}

async function sendAccessPaymentReminderEmail(to: string, firstName: string, stage: number) {
  const configs = [
    {
      subject: "Encore une étape pour rejoindre Agapeo",
      headline: "Ton inscription est presque terminée",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Il ne te reste qu'une étape avant de commencer ta recherche sur Agapeo : débloquer ton accès pour
          ${PRICE_LABEL}, valable 30 jours.
        </p>
        <p style="margin:0;">Ça ne prend qu'une minute — clique ci-dessous pour finaliser.</p>
      `
    },
    {
      subject: "Tu n'as pas encore débloqué ton accès Agapeo",
      headline: "Ta place t'attend toujours",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Hier, tu as créé ton compte Agapeo mais ton accès n'a pas encore été débloqué. Pour ${PRICE_LABEL},
          profite de 30 jours pour rencontrer des personnes dans le cadre de ton choix de partenaire, entouré(e)
          d'une communauté de célibataires chrétiens sérieux.
        </p>
        <p style="margin:0;">Reprends là où tu t'es arrêté(e), ça ne prend qu'un instant.</p>
      `
    },
    {
      subject: "Ta recherche sur Agapeo n'attend que toi",
      headline: "Prêt(e) à commencer ?",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Chaque jour, des célibataires chrétiens sérieux rejoignent Agapeo pour rencontrer quelqu'un dans le cadre
          de leur choix de partenaire. Ton accès (${PRICE_LABEL} / 30 jours) n'est toujours pas débloqué.
        </p>
        <p style="margin:0;">Termine ton inscription dès maintenant pour ne pas rester sur le pas de la porte.</p>
      `
    },
    {
      subject: "On garde ta place sur Agapeo",
      headline: "Ton compte est toujours en attente",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Depuis 3 jours, ton compte Agapeo attend que tu débloques ton accès (${PRICE_LABEL} / 30 jours) pour
          commencer à échanger avec des profils vérifiés, sérieux dans leur recherche de mariage.
        </p>
        <p style="margin:0;">Une minute suffit pour finaliser et découvrir qui t'attend.</p>
      `
    },
    {
      subject: "Il ne reste presque plus rien à faire pour rejoindre Agapeo",
      headline: "Ne laisse pas ton inscription inachevée",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Ça fait maintenant 4 jours que ton compte Agapeo attend son déblocage. Pour ${PRICE_LABEL}, tu as accès à
          30 jours pour rencontrer des personnes dans le cadre de ton choix de partenaire, en toute sérénité.
        </p>
        <p style="margin:0;">Termine ton inscription aujourd'hui.</p>
      `
    },
    {
      subject: "Dernier rappel : ton accès Agapeo n'est toujours pas débloqué",
      headline: "On t'accompagne pour finaliser",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Voici notre dernier rappel automatique : ton compte Agapeo est créé depuis 5 jours mais ton accès
          (${PRICE_LABEL} / 30 jours) n'a toujours pas été débloqué.
        </p>
        <p style="margin:0;">
          Si tu rencontres un souci pour finaliser, écris-nous à
          <a href="mailto:support@agapeo.love" style="color:#FE70B2;">support@agapeo.love</a>, on t'aidera avec plaisir.
        </p>
      `
    }
  ];

  const cfg = configs[stage];
  await sendResendEmail(
    to,
    cfg.subject,
    buildAgapeoEmailHtml({
      title: cfg.subject,
      eyebrow: "AGAPEO",
      headline: cfg.headline,
      recipientFirstName: firstName,
      contentHtml: cfg.contentHtml,
      ctaText: "Débloquer mon accès",
      ctaUrl: CTA_URL
    })
  );
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  const { data: rows, error } = await admin
    .from("profiles")
    .select(
      "id, first_name, created_at, profile_restricted!inner(subscription_status, subscription_current_period_end, access_payment_reminder_stage)"
    )
    .eq("payment_required", true)
    .eq("is_test_account", false)
    .neq("profile_restricted.subscription_status", "ACTIVE")
    .is("profile_restricted.subscription_current_period_end", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];

  for (const row of (rows ?? []) as unknown as CandidateRow[]) {
    const minutesSince = (now.getTime() - new Date(row.created_at).getTime()) / (60 * 1000);
    const stage = applicableStage(minutesSince);
    if (stage === undefined) continue;

    const alreadySentStage = row.profile_restricted.access_payment_reminder_stage;
    if (alreadySentStage !== null && alreadySentStage >= stage) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) {
      results.push({ userId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendAccessPaymentReminderEmail(email, row.first_name, stage);
      await admin.from("profile_restricted").update({ access_payment_reminder_stage: stage }).eq("id", row.id);
      results.push({ userId: row.id, sent: true, stage });
    } catch (err) {
      results.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(JSON.stringify({ reminders: results }), {
    headers: { "Content-Type": "application/json" }
  });
});
