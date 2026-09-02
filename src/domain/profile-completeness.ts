import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Barre minimale pour qu'un profil soit "actif" et proposé aux autres
 * membres dans Découvrir. L'onboarding ne bloque plus rien (il est
 * différable via "Terminer plus tard") — c'est cette fonction qui décide
 * seule de la visibilité, aussi bien côté UI (bannière de rappel) que côté
 * requête Découvrir (cf. discover.service.ts).
 *
 * Inclut genre/date de naissance/pays depuis la découverte d'un vrai bug :
 * un ancien bouton de resoumission (déjà corrigé) permettait d'atteindre
 * `submitVerificationRequestAction` — et même d'être VERIFIED par l'équipe —
 * sans jamais être passé par l'étape "Tes informations" de l'onboarding.
 * Conséquence concrète pour ces comptes : `discover.service.ts` filtre par
 * `gender`, donc un profil avec `gender = null` n'apparaît JAMAIS dans
 * Découvrir pour personne, même déjà vérifié.
 */
export function isProfileComplete(
  profile: Pick<ProfileRow, "avatar_url" | "church_denomination" | "why_marriage" | "gender" | "birth_date" | "country">
): boolean {
  return Boolean(
    profile.avatar_url && profile.church_denomination && profile.why_marriage && profile.gender && profile.birth_date && profile.country
  );
}

/** Les 5 étapes navigables de l'assistant d'onboarding (cf. onboarding-wizard.tsx) — partagé pour que le renvoi vers une étape précise reste cohérent entre le bandeau, l'action de soumission et le wizard lui-même. */
export type OnboardingStepKey = "essential" | "photos" | "selfie" | "faith" | "preferences";

export interface MissingProfileStep {
  step: OnboardingStepKey;
  label: string;
}

/** Comme `getMissingProfileFields`, mais associe chaque manque à l'étape de l'onboarding où le corriger — permet de renvoyer directement la personne à la bonne section plutôt qu'un message générique. */
export function getMissingProfileSteps(
  profile: Pick<ProfileRow, "avatar_url" | "church_denomination" | "why_marriage" | "gender" | "birth_date" | "country">
): MissingProfileStep[] {
  const missing: MissingProfileStep[] = [];
  if (!profile.gender || !profile.birth_date || !profile.country) {
    missing.push({ step: "essential", label: "tes informations essentielles (genre, date de naissance, pays)" });
  }
  if (!profile.avatar_url) missing.push({ step: "photos", label: "une photo de profil" });
  if (!profile.church_denomination) missing.push({ step: "faith", label: "ta confession chrétienne" });
  if (!profile.why_marriage) missing.push({ step: "preferences", label: "ta vision du mariage" });
  return missing;
}

export function getMissingProfileFields(
  profile: Pick<ProfileRow, "avatar_url" | "church_denomination" | "why_marriage" | "gender" | "birth_date" | "country">
): string[] {
  return getMissingProfileSteps(profile).map((m) => m.label);
}

/**
 * Vrai pour un profil dont toutes les infos sont remplies (isProfileComplete)
 * mais qui n'a jamais soumis (ou dont la soumission a été refusée) sa demande
 * de vérification — arrivable via "Terminer sans soumettre" dans l'assistant
 * d'onboarding (cf. onboarding-wizard.tsx, même prédicat). Distinct
 * d'isProfileComplete : un profil peut être "complet" sans jamais avoir
 * demandé sa validation.
 */
export function needsVerificationSubmission(profile: Pick<ProfileRow, "photo_verification_status">): boolean {
  return profile.photo_verification_status === "UNVERIFIED" || profile.photo_verification_status === "REJECTED";
}

type ScoringProfile = Pick<
  ProfileRow,
  "faith_engagement_level" | "marriage_timeline" | "desired_children_count" | "core_values" | "passions" | "hobbies"
>;

/**
 * Champs qui alimentent le moteur de compatibilité (cf. compatibility.ts) mais
 * ne sont pas requis pour être visible dans Découvrir — utilisé pour
 * expliquer pourquoi un score peut sembler bas plutôt que de le laisser
 * paraître arbitraire.
 */
export function getScoringGaps(profile: ScoringProfile): string[] {
  const gaps: string[] = [];
  if (!profile.faith_engagement_level) gaps.push("ton engagement dans la foi");
  if (!profile.marriage_timeline || !profile.desired_children_count) gaps.push("ta vision du mariage");
  if (profile.core_values.length === 0) gaps.push("tes valeurs");
  if (profile.passions.length === 0 && profile.hobbies.length === 0) gaps.push("tes centres d'intérêt");
  return gaps;
}
