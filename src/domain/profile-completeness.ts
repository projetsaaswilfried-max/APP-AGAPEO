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

export function getMissingProfileFields(
  profile: Pick<ProfileRow, "avatar_url" | "church_denomination" | "why_marriage" | "gender" | "birth_date" | "country">
): string[] {
  const missing: string[] = [];
  if (!profile.gender || !profile.birth_date || !profile.country) missing.push("tes informations essentielles (genre, date de naissance, pays)");
  if (!profile.avatar_url) missing.push("une photo de profil");
  if (!profile.church_denomination) missing.push("ta confession chrétienne");
  if (!profile.why_marriage) missing.push("ta vision du mariage");
  return missing;
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
