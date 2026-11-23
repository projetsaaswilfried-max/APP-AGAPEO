import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREMIUM_PLANS, planKeyFromDbValue, SUBSCRIPTION_HOLD_MAX_DAYS } from "@/domain/premium-plans";

/**
 * Dossier complet d'un membre, lu AVANT de laisser l'assistant parler.
 *
 * L'assistant ne devine jamais l'état d'un compte et n'a pas besoin d'un outil
 * pour l'obtenir : tout ce qui explique 95 % des demandes de support
 * (abonnement, validation de photo, paiements) est déjà dans son contexte au
 * premier message. Il peut donc répondre « ton paiement du 12 est bien passé,
 * ton accès court jusqu'au 19 » sans aucun aller-retour, au lieu de demander
 * au membre des informations que nous avons déjà.
 */
export interface MemberDossier {
  userId: string;
  email: string | null;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  country: string | null;
  onboardingCompleted: boolean;
  photoVerificationStatus: string;
  /** Motif du dernier refus de photo, s'il y en a un — ce que le membre doit corriger. */
  lastRejectionReason: string | null;
  verificationSubmittedAt: string | null;
  isSuspended: boolean;
  suspendedReason: string | null;
  subscriptionStatus: string;
  subscriptionPlanLabel: string | null;
  periodEnd: string | null;
  holdDays: number | null;
  holdStartedAt: string | null;
  payments: {
    id: string;
    status: string;
    plan: string | null;
    planLabel: string | null;
    provider: string;
    amount: string;
    createdAt: string;
    grantedAt: string | null;
  }[];
}

function formatAmount(cents: number | null, currency: string | null): string {
  if (cents == null) return "montant inconnu";
  return `${(cents / 100).toLocaleString("fr-FR")} ${currency ?? ""}`.trim();
}

export async function loadMemberDossier(userId: string): Promise<MemberDossier | null> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: restricted }, { data: transactions }, { data: verifications }, authUser] = await Promise.all([
    admin
      .from("profiles")
      .select("first_name, last_name, gender, birth_date, country, onboarding_completed, photo_verification_status")
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("profile_restricted")
      .select(
        "subscription_status, subscription_plan, subscription_current_period_end, subscription_hold_days, subscription_hold_started_at, is_suspended, suspended_reason"
      )
      .eq("id", userId)
      .maybeSingle(),
    admin
      .from("transactions")
      .select("id, status, plan, provider, amount_cents, currency, created_at, premium_granted_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("verification_requests")
      .select("status, submitted_at, reviewed_at, rejection_reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    admin.auth.admin.getUserById(userId)
  ]);

  if (!profile || !restricted) return null;

  const lastRejected = (verifications ?? []).find((v) => v.status === "REJECTED");
  const lastSubmitted = (verifications ?? [])[0];
  const planKey = planKeyFromDbValue(restricted.subscription_plan);

  return {
    userId,
    email: authUser?.data?.user?.email ?? null,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name,
    gender: profile.gender,
    birthDate: profile.birth_date,
    country: profile.country,
    onboardingCompleted: profile.onboarding_completed,
    photoVerificationStatus: profile.photo_verification_status,
    lastRejectionReason: lastRejected?.rejection_reason ?? null,
    verificationSubmittedAt: lastSubmitted?.submitted_at ?? null,
    isSuspended: restricted.is_suspended,
    suspendedReason: restricted.suspended_reason,
    subscriptionStatus: restricted.subscription_status,
    subscriptionPlanLabel: planKey ? PREMIUM_PLANS[planKey].label : restricted.subscription_plan,
    periodEnd: restricted.subscription_current_period_end,
    holdDays: restricted.subscription_hold_days === null ? null : Number(restricted.subscription_hold_days),
    holdStartedAt: restricted.subscription_hold_started_at,
    payments: (transactions ?? []).map((t) => {
      const key = planKeyFromDbValue(t.plan);
      return {
        id: t.id,
        status: t.status,
        plan: t.plan,
        planLabel: key ? PREMIUM_PLANS[key].label : t.plan,
        provider: t.provider,
        amount: formatAmount(t.amount_cents, t.currency),
        createdAt: t.created_at,
        grantedAt: t.premium_granted_at
      };
    })
  };
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Rend le dossier en texte lisible, placé dans le prompt système. Volontairement
 * du texte et non du JSON : l'assistant doit pouvoir le citer presque mot pour
 * mot au membre sans rien reformuler de travers.
 */
export function renderDossier(dossier: MemberDossier): string {
  const lines: string[] = [];

  lines.push(`Prénom : ${dossier.firstName || "(non renseigné)"}`);
  lines.push(`Email du compte : ${dossier.email ?? "(inconnu)"}`);
  lines.push(`Pays : ${dossier.country ?? "(non renseigné)"}`);
  lines.push(`Genre enregistré : ${dossier.gender ?? "(non renseigné)"}`);
  lines.push(`Date de naissance enregistrée : ${dossier.birthDate ?? "(non renseignée)"}`);
  lines.push(`Profil complété : ${dossier.onboardingCompleted ? "oui" : "non"}`);

  lines.push("");
  lines.push(`VALIDATION DE LA PHOTO : ${dossier.photoVerificationStatus}`);
  if (dossier.photoVerificationStatus === "PENDING") {
    lines.push(
      `  Selfie soumis le ${dossier.verificationSubmittedAt ? DATE_TIME_FORMAT.format(new Date(dossier.verificationSubmittedAt)) : "?"}, en attente d'examen par l'équipe.`
    );
  }
  if (dossier.photoVerificationStatus === "REJECTED") {
    lines.push(`  Dernier refus — motif communiqué : ${dossier.lastRejectionReason ?? "(aucun motif enregistré)"}`);
    lines.push("  Il peut soumettre un nouveau selfie depuis son profil.");
  }
  if (dossier.photoVerificationStatus === "UNVERIFIED") {
    lines.push("  Aucun selfie soumis à ce jour : c'est la cause la plus fréquente de « je ne peux pas écrire ».");
  }
  if (dossier.photoVerificationStatus !== "VERIFIED") {
    lines.push("  CONSÉQUENCE : il peut consulter, mais la base lui refuse l'envoi de messages tant que la photo n'est pas validée.");
  }

  lines.push("");
  lines.push(`ABONNEMENT : ${dossier.subscriptionStatus}${dossier.subscriptionPlanLabel ? ` (${dossier.subscriptionPlanLabel})` : ""}`);
  if (dossier.holdDays !== null) {
    const deadline = dossier.holdStartedAt
      ? DATE_FORMAT.format(new Date(new Date(dossier.holdStartedAt).getTime() + SUBSCRIPTION_HOLD_MAX_DAYS * 24 * 60 * 60 * 1000))
      : null;
    lines.push(
      `  ${Math.ceil(dossier.holdDays)} jour(s) EN RÉSERVE : le décompte n'a pas commencé parce que la photo n'est pas validée. ` +
        `Il ne perd rien. Démarrage automatique au plus tard le ${deadline ?? "?"} (plafond de ${SUBSCRIPTION_HOLD_MAX_DAYS} jours).`
    );
  } else if (dossier.periodEnd) {
    lines.push(`  Accès actif jusqu'au ${DATE_FORMAT.format(new Date(dossier.periodEnd))}.`);
  } else {
    lines.push("  Aucune échéance en cours.");
  }
  if (dossier.isSuspended) {
    lines.push(`  COMPTE SUSPENDU — motif : ${dossier.suspendedReason ?? "(non précisé)"}. Tu ne peux rien débloquer : escalade obligatoire.`);
  }

  lines.push("");
  if (dossier.payments.length === 0) {
    lines.push("PAIEMENTS : aucun paiement enregistré sur ce compte.");
  } else {
    lines.push("PAIEMENTS (du plus récent au plus ancien) :");
    for (const p of dossier.payments) {
      const granted = p.grantedAt ? `accès ouvert le ${DATE_TIME_FORMAT.format(new Date(p.grantedAt))}` : "accès JAMAIS ouvert";
      lines.push(
        `  - ${DATE_TIME_FORMAT.format(new Date(p.createdAt))} · ${p.status} · ${p.planLabel ?? "?"} · ${p.amount} · ${p.provider} · ${granted}`
      );
    }
  }

  return lines.join("\n");
}
