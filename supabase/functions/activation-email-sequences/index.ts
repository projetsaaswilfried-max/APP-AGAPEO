// Cron quotidien : trois séquences email indépendantes, sur le même modèle
// que subscription-expiry (paliers, un seul envoi chacun, suivi en base) —
//   1) "Soumets ton profil" (J1/J3/J5/J7 après l'inscription) pour les
//      membres encore UNVERIFIED : tant qu'ils ne soumettent pas, ils ne sont
//      ni visibles dans Découvrir ni contactables.
//   2) "Il ne te reste qu'un selfie" : relance dédiée, indépendante des
//      paliers J1/J3/J5/J7, pour les membres dont le profil est déjà COMPLET
//      (photo + confession + vision du mariage) mais qui n'ont toujours pas
//      soumis — un message bien plus motivant et actionnable qu'une relance
//      générique, puisqu'on sait exactement où ils se sont arrêtés.
//   3) "Passe Premium" (J1/J3/J5/J7 après la validation du profil) pour les
//      membres VERIFIED mais pas encore Premium.
// Comptes de test (is_test_account) toujours exclus, comme les campagnes admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Ordre croissant : le palier applicable est le plus grand jour déjà atteint.
const MILESTONES = [1, 3, 5, 7];

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

// ---------------------------------------------------------------------------
// Séquence 1 : "Soumets ton profil" (UNVERIFIED)
// ---------------------------------------------------------------------------

// Vers l'assistant d'onboarding directement (pas l'espace compte) : la
// progression déjà enregistrée (`onboarding_step`) y reprend automatiquement
// exactement là où la personne s'était arrêtée.
const SUBMIT_PROFILE_URL = `${SITE_URL}/onboarding`;

async function sendOnboardingEmail(to: string, firstName: string, day: 1 | 3 | 5 | 7) {
  const configs = {
    1: {
      subject: "Bienvenue sur Agapeo — encore une étape avant de commencer",
      headline: "Ton profil n'est pas encore visible",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Bienvenue sur Agapeo ! Ton compte est créé, mais tant que ton profil n'est pas soumis pour vérification, personne ne peut te voir dans Découvrir ni t'écrire.</p>
        <p style="margin:0;">C'est rapide (environ 5 minutes) : reprends ton profil là où tu l'avais laissé.</p>
      `,
      ctaText: "Soumettre mon profil"
    },
    3: {
      subject: "Tu n'es toujours pas visible dans Découvrir",
      headline: "Personne ne peut encore te voir",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Depuis 3 jours, ton profil Agapeo existe mais reste invisible pour les autres membres — tant qu'il n'est pas vérifié, tu n'apparais pas dans Découvrir et tu ne peux recevoir aucun message.</p>
        <p style="margin:0;">Prends deux minutes pour le soumettre : notre équipe l'examine généralement sous 48h.</p>
      `,
      ctaText: "Soumettre mon profil"
    },
    5: {
      subject: "Ça prend 2 minutes : fais-toi remarquer sur Agapeo",
      headline: "La vérification est plus simple qu'il n'y paraît",
      contentHtml: `
        <p style="margin:0 0 12px 0;">On te demande juste tes photos de profil et un selfie pris en direct (pour confirmer que c'est bien toi) — notre équipe compare les deux et valide généralement en moins de 48h.</p>
        <p style="margin:0;">Pendant ce temps, d'autres membres qui pourraient te correspondre sont déjà sur la plateforme.</p>
      `,
      ctaText: "Soumettre mon profil"
    },
    7: {
      subject: "Dernier rappel : ton profil t'attend",
      headline: "On ne veut pas que tu passes à côté",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Voici le dernier rappel automatique : ton profil Agapeo est prêt, il ne manque plus que la vérification pour qu'il devienne visible dans Découvrir.</p>
        <p style="margin:0;">Soumets-le dès maintenant — tu peux reprendre exactement là où tu t'étais arrêté(e).</p>
      `,
      ctaText: "Soumettre mon profil"
    }
  } as const;

  const cfg = configs[day];
  await sendResendEmail(
    to,
    cfg.subject,
    buildAgapeoEmailHtml({
      title: cfg.subject,
      eyebrow: "VÉRIFICATION",
      headline: cfg.headline,
      recipientFirstName: firstName,
      contentHtml: cfg.contentHtml,
      ctaText: cfg.ctaText,
      ctaUrl: SUBMIT_PROFILE_URL
    })
  );
}

// ---------------------------------------------------------------------------
// Séquence "presque fini" : profil COMPLET (photo + confession + vision du
// mariage) mais toujours pas soumis — indépendante des paliers J1/J3/J5/J7,
// un seul envoi (jamais renvoyée), et bien plus motivante puisqu'on sait
// exactement qu'il ne manque que le selfie et le clic "Soumettre".
// ---------------------------------------------------------------------------

async function sendAlmostDoneEmail(to: string, firstName: string) {
  await sendResendEmail(
    to,
    "Il ne te reste qu'un selfie pour finaliser ton profil",
    buildAgapeoEmailHtml({
      title: "Il ne te reste qu'un selfie pour finaliser ton profil",
      eyebrow: "VÉRIFICATION",
      headline: "Tu es à un pas de la fin !",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">Ton profil Agapeo est déjà complet — photos, confession, vision du mariage : tout y est. Il ne manque plus qu'un selfie en direct (pour confirmer que c'est bien toi) et un clic sur "Soumettre".</p>
        <p style="margin:0;">Ça prend littéralement 2 minutes, et notre équipe l'examine généralement sous 48h.</p>
      `,
      ctaText: "Finaliser mon profil",
      ctaUrl: SUBMIT_PROFILE_URL
    })
  );
}

// ---------------------------------------------------------------------------
// Séquence 2 : "Passe Premium" (VERIFIED, pas encore Premium)
// ---------------------------------------------------------------------------

const PREMIUM_URL = `${SITE_URL}/premium`;

async function sendPremiumUpsellEmail(to: string, firstName: string, day: 1 | 3 | 5 | 7) {
  const configs = {
    1: {
      subject: "Ton profil est vérifié — passe à la vitesse supérieure",
      headline: "Débloque tout le potentiel d'Agapeo",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Ton profil est maintenant vérifié et visible dans Découvrir — félicitations ! Avec Premium, tu peux aussi répondre aux messages et écrire en premier, voir qui s'intéresse à toi, utiliser les filtres avancés et consulter les profils sans limite.</p>
        <p style="margin:0;">Découvre les offres et choisis celle qui te convient.</p>
      `,
      ctaText: "Découvrir Premium"
    },
    3: {
      subject: "Des personnes s'intéressent peut-être déjà à toi",
      headline: "Qui s'intéresse à toi ?",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Sur Agapeo, tu peux voir qui a consulté ton profil ou l'a mis en favori — mais cette information est réservée aux membres Premium.</p>
        <p style="margin:0;">Passe Premium pour découvrir qui pense déjà à toi, et pouvoir lui écrire directement.</p>
      `,
      ctaText: "Voir les offres Premium"
    },
    5: {
      subject: "Premium à partir de 5 832 FCFA/mois",
      headline: "Deux formules, à toi de choisir",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Premium mensuel à 6 999 FCFA, ou trimestriel à 17 497 FCFA (soit environ 5 832 FCFA/mois, notre offre la plus avantageuse) — les deux donnent accès à toutes les fonctionnalités : contact en priorité, favoris, qui s'intéresse à toi, filtres avancés et consultation illimitée.</p>
        <p style="margin:0;">Choisis la formule qui te convient le mieux.</p>
      `,
      ctaText: "Voir les offres Premium"
    },
    7: {
      subject: "Dernière ligne droite pour débloquer tout Agapeo",
      headline: "On te garde tes avantages au chaud",
      contentHtml: `
        <p style="margin:0 0 12px 0;">Voici le dernier rappel automatique : ton profil vérifié n'attend plus qu'un abonnement Premium pour t'ouvrir toutes les portes d'Agapeo.</p>
        <p style="margin:0;">Tu peux passer Premium à tout moment depuis l'onglet "Mon Plan" de ton compte.</p>
      `,
      ctaText: "Voir les offres Premium"
    }
  } as const;

  const cfg = configs[day];
  await sendResendEmail(
    to,
    cfg.subject,
    buildAgapeoEmailHtml({
      title: cfg.subject,
      eyebrow: "PREMIUM",
      headline: cfg.headline,
      recipientFirstName: firstName,
      contentHtml: cfg.contentHtml,
      ctaText: cfg.ctaText,
      ctaUrl: PREMIUM_URL
    })
  );
}

// ---------------------------------------------------------------------------

function applicableMilestone(daysSince: number): number | undefined {
  // Le plus grand palier déjà atteint (ex: J4 -> palier 3, J10 -> palier 7).
  return [...MILESTONES].reverse().find((m) => daysSince >= m);
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  // ---- Séquence 1 : UNVERIFIED depuis 1 à 7+ jours, + relance dédiée "presque fini" ----
  const onboardingResults: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];
  {
    const { data: rows, error } = await admin
      .from("profiles")
      .select("id, first_name, created_at, avatar_url, church_denomination, why_marriage, profile_restricted(onboarding_sequence_stage, almost_done_nudge_sent)")
      .eq("photo_verification_status", "UNVERIFIED")
      .eq("is_test_account", false);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    for (const row of (rows ?? []) as unknown as {
      id: string;
      first_name: string;
      created_at: string;
      avatar_url: string | null;
      church_denomination: string | null;
      why_marriage: string | null;
      profile_restricted: { onboarding_sequence_stage: number | null; almost_done_nudge_sent: boolean } | null;
    }[]) {
      const isProfileComplete = Boolean(row.avatar_url && row.church_denomination && row.why_marriage);
      const wantsAlmostDone = isProfileComplete && !(row.profile_restricted?.almost_done_nudge_sent ?? false);

      const daysSince = Math.floor((now.getTime() - new Date(row.created_at).getTime()) / (24 * 60 * 60 * 1000));
      const milestone = applicableMilestone(daysSince);
      const stage = row.profile_restricted?.onboarding_sequence_stage ?? null;
      const wantsMilestone = milestone !== undefined && (stage === null || stage < milestone);

      if (!wantsAlmostDone && !wantsMilestone) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      const email = authUser?.user?.email;
      if (!email) {
        onboardingResults.push({ userId: row.id, sent: false, reason: "Email introuvable" });
        continue;
      }

      // Priorité à la relance dédiée quand elle s'applique : plus motivante
      // et plus précise qu'un message générique de palier — celui-ci
      // reprendra normalement lors d'une prochaine exécution si toujours pas soumis.
      if (wantsAlmostDone) {
        try {
          await sendAlmostDoneEmail(email, row.first_name);
          await admin.from("profile_restricted").update({ almost_done_nudge_sent: true }).eq("id", row.id);
          onboardingResults.push({ userId: row.id, sent: true, reason: "Relance dédiée : profil complet, selfie manquant" });
        } catch (err) {
          onboardingResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi (relance dédiée)" });
        }
        continue;
      }

      try {
        await sendOnboardingEmail(email, row.first_name, milestone as 1 | 3 | 5 | 7);
        await admin.from("profile_restricted").update({ onboarding_sequence_stage: milestone }).eq("id", row.id);
        onboardingResults.push({ userId: row.id, sent: true, stage: milestone });
      } catch (err) {
        onboardingResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
      }
    }
  }

  // ---- Séquence 2 : VERIFIED mais pas Premium, depuis 1 à 7+ jours de validation ----
  const premiumResults: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];
  {
    const { data: rows, error } = await admin
      .from("profiles")
      .select("id, first_name, profile_restricted!inner(subscription_status, premium_sequence_stage)")
      .eq("photo_verification_status", "VERIFIED")
      .eq("is_test_account", false)
      .neq("profile_restricted.subscription_status", "ACTIVE");

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    for (const row of (rows ?? []) as unknown as {
      id: string;
      first_name: string;
      profile_restricted: { subscription_status: string; premium_sequence_stage: number | null };
    }[]) {
      // Référence = dernière validation (verification_requests.reviewed_at), pas created_at du profil.
      const { data: lastApproval } = await admin
        .from("verification_requests")
        .select("reviewed_at")
        .eq("user_id", row.id)
        .eq("status", "VERIFIED")
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastApproval?.reviewed_at) continue;

      const daysSince = Math.floor((now.getTime() - new Date(lastApproval.reviewed_at).getTime()) / (24 * 60 * 60 * 1000));
      const milestone = applicableMilestone(daysSince);
      if (milestone === undefined) continue;

      const stage = row.profile_restricted.premium_sequence_stage;
      if (stage !== null && stage >= milestone) continue;

      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      const email = authUser?.user?.email;
      if (!email) {
        premiumResults.push({ userId: row.id, sent: false, reason: "Email introuvable" });
        continue;
      }

      try {
        await sendPremiumUpsellEmail(email, row.first_name, milestone as 1 | 3 | 5 | 7);
        await admin.from("profile_restricted").update({ premium_sequence_stage: milestone }).eq("id", row.id);
        premiumResults.push({ userId: row.id, sent: true, stage: milestone });
      } catch (err) {
        premiumResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
      }
    }
  }

  return new Response(JSON.stringify({ onboarding: onboardingResults, premium: premiumResults }), {
    headers: { "Content-Type": "application/json" }
  });
});
