import type { ProfileRow } from "@/lib/supabase/database.types";
import { computeAge } from "@/domain/badges";

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b.map(normalize));
  const seen = new Set<string>();
  return a.filter((item) => {
    const key = normalize(item);
    if (seen.has(key) || !setB.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  return intersection(a, b).length / Math.min(a.length, b.length);
}

/**
 * Moteur de compatibilité — déterministe et explicable (règle 7 du cahier
 * des charges). Chaque dimension a un poids fixe totalisant 100 points ; le
 * détail est isolé ici pour pouvoir faire évoluer la pondération ou brancher
 * un futur modèle plus sophistiqué sans toucher au reste de l'application.
 */
export function computeCompatibility(viewer: ProfileRow, candidate: ProfileRow): CompatibilityResult {
  let score = 0;
  const reasons: string[] = [];

  // Foi — 20 pts
  if (viewer.church_denomination && candidate.church_denomination) {
    if (normalize(viewer.church_denomination) === normalize(candidate.church_denomination)) {
      score += 12;
      reasons.push("Vous partagez la même confession chrétienne");
    }
  }
  if (viewer.faith_engagement_level && candidate.faith_engagement_level) {
    if (normalize(viewer.faith_engagement_level) === normalize(candidate.faith_engagement_level)) {
      score += 8;
      reasons.push("Un engagement dans la foi de niveau similaire");
    }
  }

  // Vision du mariage — 20 pts
  if (viewer.desired_children_count && candidate.desired_children_count) {
    if (normalize(viewer.desired_children_count) === normalize(candidate.desired_children_count)) {
      score += 8;
      reasons.push("Une vision similaire du nombre d'enfants souhaité");
    }
  }
  if (viewer.marriage_timeline && candidate.marriage_timeline) {
    if (normalize(viewer.marriage_timeline) === normalize(candidate.marriage_timeline)) {
      score += 6;
      reasons.push("Un projet de mariage dans un délai similaire");
    }
  }
  if (viewer.relocation_ready === candidate.relocation_ready) {
    score += 6;
    reasons.push("Une disponibilité similaire à déménager pour le mariage");
  }

  // Valeurs communes — 20 pts
  const sharedValues = intersection(viewer.core_values, candidate.core_values);
  if (sharedValues.length > 0) {
    score += Math.round(overlapRatio(viewer.core_values, candidate.core_values) * 20);
    reasons.push(`Des valeurs communes : ${sharedValues.slice(0, 3).join(", ")}`);
  }

  // Centres d'intérêt / passions — 15 pts
  const sharedInterests = intersection(
    [...viewer.passions, ...viewer.hobbies],
    [...candidate.passions, ...candidate.hobbies]
  );
  if (sharedInterests.length > 0) {
    score += Math.round(
      overlapRatio([...viewer.passions, ...viewer.hobbies], [...candidate.passions, ...candidate.hobbies]) * 15
    );
    reasons.push(`Des centres d'intérêt communs : ${sharedInterests.slice(0, 3).join(", ")}`);
  }

  // Localisation — 15 pts
  if (normalize(viewer.country) === normalize(candidate.country)) {
    score += 15;
    reasons.push("Vous vivez dans le même pays");
  } else {
    const viewerWantsCandidateCountry = viewer.desired_countries.some((c) => normalize(c) === normalize(candidate.country));
    const candidateWantsViewerCountry = candidate.desired_countries.some((c) => normalize(c) === normalize(viewer.country));
    if (viewerWantsCandidateCountry || candidateWantsViewerCountry) {
      score += 8;
      reasons.push("Votre localisation correspond à ce que vous recherchez");
    }
  }

  // Tranche d'âge réciproque — 10 pts
  const viewerAge = computeAge(viewer.birth_date);
  const candidateAge = computeAge(candidate.birth_date);
  const candidateInViewerRange = candidateAge >= viewer.desired_age_min && candidateAge <= viewer.desired_age_max;
  const viewerInCandidateRange = viewerAge >= candidate.desired_age_min && viewerAge <= candidate.desired_age_max;
  if (candidateInViewerRange && viewerInCandidateRange) {
    score += 10;
    reasons.push("Vous correspondez tous les deux à la tranche d'âge recherchée");
  } else if (candidateInViewerRange || viewerInCandidateRange) {
    score += 5;
  }

  if (reasons.length === 0) {
    reasons.push("Compatibilité de base sur les critères disponibles — complétez vos profils pour affiner");
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}
