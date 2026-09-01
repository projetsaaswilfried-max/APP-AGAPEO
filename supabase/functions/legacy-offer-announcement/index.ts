// Cron toutes les 5 minutes : annonce ponctuelle du nouveau modèle payant
// (accès unique, cf. migration new_signup_payment_required) aux membres déjà
// présents avant ce pivot (payment_required = false) qui n'ont pas d'accès
// actif — 5 paliers : 1h, J+1, J+2, J+3, J+5 après
// profile_restricted.legacy_offer_announced_at (backfillé une seule fois au
// déploiement, même horodatage pour toute la cohorte — cf. migration
// legacy_offer_announcement.sql). Un seul envoi par palier et par compte,
// suivi via profile_restricted.legacy_offer_reminder_stage.
//
// `subscription_status <> 'ACTIVE'` est revérifié à CHAQUE exécution (pas
// seulement au moment du backfill) : un membre qui débloque son accès en
// cours de séquence sort de lui-même du lot dès le prochain passage, sans
// logique d'annulation à écrire explicitement (même principe que
// new-signup-payment-reminder).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Doit rester synchronisé avec PREMIUM_PLANS.ACCESS dans src/domain/premium-plans.ts
// (runtime Deno isolé de l'app Next.js, aucun module partageable entre les deux).
const PRICE_LABEL = "4 083 FCFA";
const CTA_URL = `${SITE_URL}/login?redirectTo=/premium`;

// Index = palier. En minutes pour pouvoir exprimer "1 heure" comme J+1..J+5.
const MILESTONES_MINUTES = [60, 24 * 60, 2 * 24 * 60, 3 * 24 * 60, 5 * 24 * 60];

interface CandidateRow {
  id: string;
  first_name: string;
  profile_restricted: {
    subscription_status: string;
    legacy_offer_announced_at: string;
    legacy_offer_reminder_stage: number | null;
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

async function sendLegacyOfferEmail(to: string, firstName: string, stage: number) {
  const configs = [
    {
      subject: "Une nouveauté sur Agapeo",
      headline: "Un nouvel accès complet t'attend",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Agapeo évolue : un accès complet à toute la plateforme (Découvrir, messagerie, invitations, favoris...) est
          maintenant disponible pour ${PRICE_LABEL}, valable 30 jours.
        </p>
        <p style="margin:0;">De quoi explorer sereinement la communauté et trouver la personne faite pour toi.</p>
      `
    },
    {
      subject: "Découvre tout ce qu'Agapeo a à t'offrir",
      headline: "Explore la communauté sans limite",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Depuis hier, un accès complet à Agapeo est disponible pour ${PRICE_LABEL} / 30 jours : messagerie illimitée,
          invitations, favoris, filtres avancés et bien plus.
        </p>
        <p style="margin:0;">Prends le temps de découvrir qui pourrait être la bonne personne pour toi.</p>
      `
    },
    {
      subject: "Ton accès complet à Agapeo, toujours disponible",
      headline: "Ne reste pas sur le pas de la porte",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Beaucoup de membres explorent déjà toute la plateforme grâce à l'accès complet (${PRICE_LABEL} / 30 jours).
          C'est l'occasion de rencontrer des personnes dans le cadre de ton choix de partenaire.
        </p>
        <p style="margin:0;">Débloque ton accès en quelques instants.</p>
      `
    },
    {
      subject: "Toujours envie d'explorer Agapeo pleinement ?",
      headline: "Ta recherche mérite un accès complet",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Pour ${PRICE_LABEL}, profite de 30 jours d'accès complet à Agapeo : Découvrir, messagerie, invitations et
          bien plus, sans restriction.
        </p>
        <p style="margin:0;">Une petite étape pour avancer sérieusement dans ta recherche.</p>
      `
    },
    {
      subject: "Dernier rappel : ton accès complet à Agapeo",
      headline: "On t'accompagne pour explorer Agapeo",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Voici notre dernier rappel automatique à ce sujet : un accès complet à Agapeo (${PRICE_LABEL} / 30 jours)
          reste disponible à tout moment depuis ton espace "Mon Plan".
        </p>
        <p style="margin:0;">
          Une question ? Écris-nous à
          <a href="mailto:support@agapeo.love" style="color:#FE70B2;">support@agapeo.love</a>.
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
      "id, first_name, profile_restricted!inner(subscription_status, legacy_offer_announced_at, legacy_offer_reminder_stage)"
    )
    .eq("payment_required", false)
    .eq("is_test_account", false)
    .neq("profile_restricted.subscription_status", "ACTIVE")
    .not("profile_restricted.legacy_offer_announced_at", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];

  for (const row of (rows ?? []) as unknown as CandidateRow[]) {
    const minutesSince = (now.getTime() - new Date(row.profile_restricted.legacy_offer_announced_at).getTime()) / (60 * 1000);
    const stage = applicableStage(minutesSince);
    if (stage === undefined) continue;

    const alreadySentStage = row.profile_restricted.legacy_offer_reminder_stage;
    if (alreadySentStage !== null && alreadySentStage >= stage) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) {
      results.push({ userId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    try {
      await sendLegacyOfferEmail(email, row.first_name, stage);
      await admin.from("profile_restricted").update({ legacy_offer_reminder_stage: stage }).eq("id", row.id);
      results.push({ userId: row.id, sent: true, stage });
    } catch (err) {
      results.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(JSON.stringify({ reminders: results }), {
    headers: { "Content-Type": "application/json" }
  });
});
