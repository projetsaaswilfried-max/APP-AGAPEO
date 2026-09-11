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
//   3) "Passe Premium" (tous les 2 jours sur 30 jours après la validation du
//      profil, email + message Agapeo dans la messagerie) pour les membres
//      VERIFIED mais pas encore Premium.
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
// Séquence 2 : "Passe Premium" (VERIFIED, pas encore Premium) — tous les 2
// jours sur 30 jours (élargi depuis J1/J3/J5/J7, achats en baisse), sur deux
// canaux (email + message Agapeo dans la messagerie, cf. sendAgapeoSystemMessage
// plus bas) suivis indépendamment. Le contenu est choisi selon un signal de
// comportement réel plutôt qu'un texte générique fixe :
//   - la personne a déjà reçu de l'intérêt (favori/vue/like)   -> segment INTERESTED
//   - sinon, des profils très compatibles (>=85%) existent      -> segment COMPATIBLE
//   - sinon                                                     -> segment GENERIC
// Le moteur de compatibilité est une copie volontaire (et non un import) de
// src/domain/matching/compatibility.ts, même raison et même précédent que
// weekly-digest : les Edge Functions Deno ne résolvent pas les alias "@/...".
// ---------------------------------------------------------------------------

const PREMIUM_URL = `${SITE_URL}/premium`;
const PREMIUM_MILESTONES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

interface CompatProfileRow {
  id: string;
  church_denomination: string | null;
  faith_engagement_level: string | null;
  core_values: string[];
  hobbies: string[];
  country: string;
  desired_countries: string[];
  birth_date: string;
  desired_age_min: number;
  desired_age_max: number;
  marital_status: string | null;
  desired_marital_statuses: string[];
}

// Défensif contre un élément null au sein d'un tableau text[] (core_values,
// hobbies, desired_countries...) — Postgres n'interdit pas un NULL isolé
// dans un tableau même si la colonne elle-même est NOT NULL. Un vrai crash
// en prod l'a confirmé (une valeur non-string a fait planter toute la
// Séquence 2) — mieux vaut ignorer silencieusement cet élément que de
// bloquer le traitement de tous les autres membres derrière lui dans la boucle.
function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function intersectionCount(a: string[], b: string[]): number {
  const setB = new Set(b.map(normalizeText));
  return a.filter((item) => setB.has(normalizeText(item))).length;
}

function overlapRatioLocal(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  return intersectionCount(a, b) / Math.min(a.length, b.length);
}

function computeAgeLocal(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function computeCompatibilityScore(viewer: CompatProfileRow, candidate: CompatProfileRow): number {
  let score = 0;
  if (viewer.church_denomination && candidate.church_denomination && normalizeText(viewer.church_denomination) === normalizeText(candidate.church_denomination)) {
    score += 12;
  }
  if (viewer.faith_engagement_level && candidate.faith_engagement_level && normalizeText(viewer.faith_engagement_level) === normalizeText(candidate.faith_engagement_level)) {
    score += 8;
  }
  score += Math.round(overlapRatioLocal(viewer.core_values, candidate.core_values) * 20);
  score += Math.round(overlapRatioLocal(viewer.hobbies, candidate.hobbies) * 15);
  if (normalizeText(viewer.country) === normalizeText(candidate.country)) {
    score += 15;
  } else if (
    viewer.desired_countries.some((c) => normalizeText(c) === normalizeText(candidate.country)) ||
    candidate.desired_countries.some((c) => normalizeText(c) === normalizeText(viewer.country))
  ) {
    score += 8;
  }
  const viewerAge = computeAgeLocal(viewer.birth_date);
  const candidateAge = computeAgeLocal(candidate.birth_date);
  const candidateInRange = candidateAge >= viewer.desired_age_min && candidateAge <= viewer.desired_age_max;
  const viewerInRange = viewerAge >= candidate.desired_age_min && viewerAge <= candidate.desired_age_max;
  if (candidateInRange && viewerInRange) score += 10;
  else if (candidateInRange || viewerInRange) score += 5;
  const candidateMaritalOk =
    viewer.desired_marital_statuses.length === 0 || !candidate.marital_status || viewer.desired_marital_statuses.includes(candidate.marital_status);
  const viewerMaritalOk =
    candidate.desired_marital_statuses.length === 0 || !viewer.marital_status || candidate.desired_marital_statuses.includes(viewer.marital_status);
  if (candidateMaritalOk && viewerMaritalOk) score += 20;
  else if (candidateMaritalOk || viewerMaritalOk) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

type PremiumSegment = "INTERESTED" | "COMPATIBLE" | "GENERIC";

function buildPremiumContent(segment: PremiumSegment, count: number, isLate: boolean) {
  if (segment === "INTERESTED") {
    return {
      subject: isLate ? `${count} personne(s) attendent toujours de tes nouvelles sur Agapeo` : "Des personnes s'intéressent déjà à toi",
      headline: "Qui s'intéresse à toi ?",
      contentHtml: `
        <p style="margin:0 0 12px 0;">${count} personne${count > 1 ? "s ont" : " a"} déjà manifesté de l'intérêt pour ton profil sur Agapeo (favori, vue ou like) — mais son identité reste réservée aux membres Premium.</p>
        <p style="margin:0;">Passe Premium pour découvrir qui, et pouvoir lui écrire directement.</p>
      `,
      ctaText: "Découvrir qui s'intéresse à moi"
    };
  }
  if (segment === "COMPATIBLE") {
    return {
      subject: isLate ? `${count} profils très compatibles t'attendent encore` : `${count} profils très compatibles avec toi en ce moment`,
      headline: "De bons profils t'attendent",
      contentHtml: `
        <p style="margin:0 0 12px 0;">${count} profil${count > 1 ? "s ont" : " a"} au moins 85% de compatibilité avec toi sur Agapeo en ce moment.</p>
        <p style="margin:0;">Sans abonnement, tu ne peux ni les consulter en entier, ni leur écrire — passe Premium pour aller plus loin.</p>
      `,
      ctaText: "Voir les offres Premium"
    };
  }
  return {
    subject: isLate ? "Dernière ligne droite pour débloquer tout Agapeo" : "Rappel : comment fonctionne Agapeo",
    headline: isLate ? "On te garde tes avantages au chaud" : "Débloque tout le potentiel d'Agapeo",
    contentHtml: `
      <p style="margin:0 0 12px 0;">Sur Agapeo, ${isLate ? "il ne manque plus qu'un abonnement Premium pour" : "un abonnement Premium te permet de"} consulter les profils en entier, démarrer des conversations, voir qui s'intéresse à toi et utiliser les filtres avancés.</p>
      <p style="margin:0;">Découvre les formules disponibles et choisis celle qui te convient.</p>
    `,
    ctaText: "Voir les offres Premium"
  };
}

function stripHtmlForMessage(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendPremiumUpsellEmail(to: string, firstName: string, content: ReturnType<typeof buildPremiumContent>) {
  await sendResendEmail(
    to,
    content.subject,
    buildAgapeoEmailHtml({
      title: content.subject,
      eyebrow: "PREMIUM",
      headline: content.headline,
      recipientFirstName: firstName,
      contentHtml: content.contentHtml,
      ctaText: content.ctaText,
      ctaUrl: PREMIUM_URL
    })
  );
}

// Compte réel `profiles` (is_staff) servant d'expéditeur aux messages
// automatiques Agapeo — cf. src/domain/system-account.ts (même UUID, dupliqué
// en dur ici pour la même raison que le moteur de compatibilité ci-dessus).
const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";

async function sendAgapeoSystemMessage(admin: ReturnType<typeof createClient>, memberId: string, content: string): Promise<void> {
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

  const { error: messageError } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: AGAPEO_SYSTEM_PROFILE_ID, type: "TEXT", content });
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

// ---------------------------------------------------------------------------
// Un simple `.select()` sans plafond explicite tronque silencieusement à 1000
// lignes côté PostgREST — piège déjà rencontré ailleurs sur ce projet
// (cf. fetchAllRows côté app). Vérifié en conditions réelles avant ce
// correctif : la requête VERIFIED + pas ACTIVE de la Séquence 2 renvoyait
// déjà exactement 1000 lignes tronquées. Pagination par lots croissants,
// même principe que fetchAllCandidates (discover.service.ts).
// ---------------------------------------------------------------------------

async function fetchAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const first = await fetchPage(0, PAGE_SIZE - 1);
  if (first.length < PAGE_SIZE) return first;

  const all = [...first];
  let nextPage = 1;
  let batchSize = 1;
  while (true) {
    const pages = await Promise.all(
      Array.from({ length: batchSize }, (_, i) => {
        const from = (nextPage + i) * PAGE_SIZE;
        return fetchPage(from, from + PAGE_SIZE - 1);
      })
    );
    pages.forEach((p) => all.push(...p));
    if (pages.some((p) => p.length < PAGE_SIZE)) break;
    nextPage += batchSize;
    batchSize *= 2;
  }
  return all;
}

function applicableMilestone(daysSince: number, milestones: number[]): number | undefined {
  // Le plus grand palier déjà atteint (ex: J4 -> palier 3, J10 -> palier 7).
  return [...milestones].reverse().find((m) => daysSince >= m);
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
      const milestone = applicableMilestone(daysSince, MILESTONES);
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

  // ---- Séquence 2 : VERIFIED mais pas Premium, tous les 2 jours sur 30 jours, email + messagerie ----
  const premiumResults: { userId: string; channel: "email" | "in_app"; sent: boolean; stage?: number; reason?: string }[] = [];
  try {
    type PremiumCandidateRow = {
      id: string;
      first_name: string;
      gender: "MALE" | "FEMALE";
      profile_restricted: { subscription_status: string; premium_sequence_stage: number | null; in_app_premium_nudge_stage: number | null };
    } & CompatProfileRow;

    // Les paliers s'arrêtent à 30 jours (PREMIUM_MILESTONES) — quelqu'un
    // validé il y a 6 mois ne sera plus jamais "dû" de toute façon. Partir de
    // `verification_requests` restreint à cette fenêtre de 31 jours (plutôt
    // que de charger TOUS les membres VERIFIED non-Premium, potentiellement
    // toute la base historique) réduit le volume traité aux seuls candidats
    // réellement pertinents pour cette relance — c'est ce qui a fait
    // dépasser le budget de la fonction lors des premiers essais en
    // conditions réelles (timeout puis WORKER_RESOURCE_LIMIT).
    const windowStart = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const recentVerifications = await fetchAllPages<{ user_id: string; reviewed_at: string }>(async (from, to) => {
      const { data, error } = await admin
        .from("verification_requests")
        .select("user_id, reviewed_at")
        .eq("status", "VERIFIED")
        .gte("reviewed_at", windowStart)
        .lte("reviewed_at", windowEnd)
        // Desc : la boucle de dédoublonnage ci-dessous garde la première
        // occurrence rencontrée par membre (utile si plusieurs demandes de
        // vérification existent) — donc la plus récente doit venir en premier.
        .order("reviewed_at", { ascending: false })
        .range(from, to);
      if (error) throw new Error(error.message);
      return (data ?? []) as { user_id: string; reviewed_at: string }[];
    });
    const lastApprovalByUser = new Map<string, string>();
    for (const v of recentVerifications) {
      if (!lastApprovalByUser.has(v.user_id)) lastApprovalByUser.set(v.user_id, v.reviewed_at);
    }

    // Une seule exécution ne peut pas évaluer 1700+ membres (timeout puis
    // WORKER_RESOURCE_LIMIT constatés en conditions réelles) — on plafonne
    // donc le nombre traité PAR EXÉCUTION. Tirage aléatoire plutôt qu'un
    // ordre fixe (ex: plus anciens d'abord) : un ordre fixe re-sélectionnerait
    // indéfiniment les MÊMES personnes tant qu'elles n'ont pas fini de
    // rattraper leur palier, empêchant les autres d'être jamais traitées. Le
    // cron quotidien absorbe ainsi le rattrapage initial sur plusieurs jours
    // en couvrant une portion différente à chaque exécution ; en régime
    // normal (quelques dizaines de nouvelles validations/jour), ce plafond
    // n'est de toute façon jamais atteint. Chaque envoi réussi avance le
    // palier en base (stage), donc le travail déjà fait n'est jamais refait.
    const MAX_CANDIDATES_PER_RUN = 200;
    const shuffledIds = [...lastApprovalByUser.keys()];
    for (let i = shuffledIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }
    const allIds = shuffledIds.slice(0, MAX_CANDIDATES_PER_RUN);

    // `.in()` avec des centaines d'ids d'un coup dépasse la longueur d'URL
    // maximale ("Invalid URL", constaté en conditions réelles) — on découpe
    // donc par lots plutôt qu'une seule requête géante, même si `allIds`
    // devrait rester modeste ici (bornée par le volume de validations sur
    // ~30 jours, pas par la base entière).
    const ID_CHUNK_SIZE = 150;
    const idChunks: string[][] = [];
    for (let i = 0; i < allIds.length; i += ID_CHUNK_SIZE) idChunks.push(allIds.slice(i, i + ID_CHUNK_SIZE));

    // Chaque lot est traité l'un après l'autre (pas Promise.all sur tous les
    // lots) : lancer toutes les pages de tous les lots en même temps a déjà
    // fait dépasser une limite de ressources (WORKER_RESOURCE_LIMIT).
    async function fetchByIdChunks<Row>(
      buildQuery: (chunkIds: string[], from: number, to: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>
    ): Promise<Row[]> {
      const all: Row[] = [];
      for (const chunk of idChunks) {
        const chunkRows = await fetchAllPages<Row>(async (from, to) => {
          const { data, error } = await buildQuery(chunk, from, to);
          if (error) throw new Error(error.message);
          return data ?? [];
        });
        all.push(...chunkRows);
      }
      return all;
    }

    const PREMIUM_ROW_COLUMNS =
      "id, first_name, gender, church_denomination, faith_engagement_level, core_values, hobbies, country, desired_countries, birth_date, desired_age_min, desired_age_max, marital_status, desired_marital_statuses, profile_restricted!inner(subscription_status, premium_sequence_stage, in_app_premium_nudge_stage)";

    const rows =
      allIds.length === 0
        ? []
        : (
            await fetchByIdChunks<PremiumCandidateRow>((chunk, from, to) =>
              admin
                .from("profiles")
                .select(PREMIUM_ROW_COLUMNS)
                .in("id", chunk)
                .eq("photo_verification_status", "VERIFIED")
                .eq("is_test_account", false)
                .neq("profile_restricted.subscription_status", "ACTIVE")
                .range(from, to)
            )
          ).map((r) => r as unknown as PremiumCandidateRow);

    // Vivier de candidats "profil complet" par genre, chargé une seule fois
    // par exécution (plutôt que refait pour chaque membre à évaluer) — même
    // calcul que getDiscoverPage côté app. Plafonné à 500 (comme l'était
    // Découvrir avant le correctif "plus de plafond" de cette session) : ici
    // ce n'est qu'un ordre de grandeur pour un texte de relance ("N profils
    // très compatibles"), pas un affichage exhaustif — charger l'intégralité
    // de la base à chaque exécution a fait dépasser la limite de ressources
    // de la fonction (WORKER_RESOURCE_LIMIT, constaté en conditions réelles).
    const CANDIDATE_COLUMNS =
      "id, church_denomination, faith_engagement_level, core_values, hobbies, country, desired_countries, birth_date, desired_age_min, desired_age_max, marital_status, desired_marital_statuses";
    const fetchCandidatePool = async (gender: "MALE" | "FEMALE"): Promise<CompatProfileRow[]> => {
      const { data, error } = await admin
        .from("profiles")
        .select(CANDIDATE_COLUMNS)
        .eq("gender", gender)
        .eq("is_test_account", false)
        .not("avatar_url", "is", null)
        .not("church_denomination", "is", null)
        .not("why_marriage", "is", null)
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as CompatProfileRow[];
    };
    const candidatesByGender: Record<"MALE" | "FEMALE", CompatProfileRow[]> = {
      MALE: await fetchCandidatePool("MALE"),
      FEMALE: await fetchCandidatePool("FEMALE")
    };

    const [favoritedRows, viewedRows, likedRows] = await Promise.all([
      fetchByIdChunks<{ user_id: string; favorite_profile_id: string }>((chunk, from, to) =>
        admin.from("favorites").select("user_id, favorite_profile_id").in("favorite_profile_id", chunk).range(from, to)
      ),
      fetchByIdChunks<{ viewer_id: string; viewed_profile_id: string }>((chunk, from, to) =>
        admin.from("profile_views").select("viewer_id, viewed_profile_id").in("viewed_profile_id", chunk).range(from, to)
      ),
      fetchByIdChunks<{ user_id: string; liked_profile_id: string }>((chunk, from, to) =>
        admin.from("profile_likes").select("user_id, liked_profile_id").in("liked_profile_id", chunk).range(from, to)
      )
    ]);
    const interestedByUser = new Map<string, Set<string>>();
    const addInterest = (targetId: string, sourceId: string) => {
      const set = interestedByUser.get(targetId) ?? new Set<string>();
      set.add(sourceId);
      interestedByUser.set(targetId, set);
    };
    favoritedRows.forEach((r) => addInterest(r.favorite_profile_id, r.user_id));
    viewedRows.forEach((r) => addInterest(r.viewed_profile_id, r.viewer_id));
    likedRows.forEach((r) => addInterest(r.liked_profile_id, r.user_id));

    interface DueSend {
      row: PremiumCandidateRow;
      milestone: number;
      wantsEmail: boolean;
      wantsInApp: boolean;
      content: ReturnType<typeof buildPremiumContent>;
    }

    const due: DueSend[] = [];
    for (const row of rows) {
      const reviewedAt = lastApprovalByUser.get(row.id);
      if (!reviewedAt) continue;

      const daysSince = Math.floor((now.getTime() - new Date(reviewedAt).getTime()) / (24 * 60 * 60 * 1000));
      const milestone = applicableMilestone(daysSince, PREMIUM_MILESTONES);
      if (milestone === undefined) continue;

      const emailStage = row.profile_restricted.premium_sequence_stage;
      const inAppStage = row.profile_restricted.in_app_premium_nudge_stage;
      const wantsEmail = emailStage === null || emailStage < milestone;
      const wantsInApp = inAppStage === null || inAppStage < milestone;
      if (!wantsEmail && !wantsInApp) continue;

      const interestedCount = interestedByUser.get(row.id)?.size ?? 0;
      let segment: PremiumSegment = "GENERIC";
      let count = 0;
      if (interestedCount > 0) {
        segment = "INTERESTED";
        count = interestedCount;
      } else {
        const targetGender = row.gender === "MALE" ? "FEMALE" : "MALE";
        const compatibleCount = candidatesByGender[targetGender].filter((c) => computeCompatibilityScore(row, c) >= 85).length;
        if (compatibleCount > 0) {
          segment = "COMPATIBLE";
          count = compatibleCount;
        }
      }

      const isLate = PREMIUM_MILESTONES.indexOf(milestone) >= 7;
      due.push({ row, milestone, wantsEmail, wantsInApp, content: buildPremiumContent(segment, count, isLate) });
    }

    // Envois par lots parallèles (réseau : Resend + inserts messagerie) —
    // entièrement séquentiel aurait re-timeout dès que plusieurs dizaines de
    // membres sont dus le même jour (cas fréquent : beaucoup de validations
    // groupées sur les mêmes journées).
    const SEND_BATCH_SIZE = 20;
    for (let i = 0; i < due.length; i += SEND_BATCH_SIZE) {
      const batch = due.slice(i, i + SEND_BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ row, milestone, wantsEmail, wantsInApp, content }) => {
          if (wantsEmail) {
            const { data: authUser } = await admin.auth.admin.getUserById(row.id);
            const email = authUser?.user?.email;
            if (!email) {
              premiumResults.push({ userId: row.id, channel: "email", sent: false, reason: "Email introuvable" });
            } else {
              try {
                await sendPremiumUpsellEmail(email, row.first_name, content);
                await admin.from("profile_restricted").update({ premium_sequence_stage: milestone }).eq("id", row.id);
                premiumResults.push({ userId: row.id, channel: "email", sent: true, stage: milestone });
              } catch (err) {
                premiumResults.push({ userId: row.id, channel: "email", sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
              }
            }
          }

          if (wantsInApp) {
            try {
              await sendAgapeoSystemMessage(admin, row.id, `${content.headline} — ${stripHtmlForMessage(content.contentHtml)}`);
              await admin.from("profile_restricted").update({ in_app_premium_nudge_stage: milestone }).eq("id", row.id);
              premiumResults.push({ userId: row.id, channel: "in_app", sent: true, stage: milestone });
            } catch (err) {
              premiumResults.push({ userId: row.id, channel: "in_app", sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
            }
          }
        })
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur Séquence 2", premium: premiumResults }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ onboarding: onboardingResults, premium: premiumResults }), {
    headers: { "Content-Type": "application/json" }
  });
});
