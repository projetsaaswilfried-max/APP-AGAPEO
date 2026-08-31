import type { RecommendedProfileItem } from "@/domain/types/discover";

/**
 * Taille du vivier dans lequel la sélection quotidienne est tirée au sort —
 * toujours un multiple de `count` pour garantir assez de variété d'un jour à
 * l'autre tout en restant parmi les meilleurs scores (jamais un tirage au
 * sort sur l'ensemble des profils, qui ignorerait les informations
 * renseignées par le membre : âge recherché, situation matrimoniale, foi...).
 */
const POOL_MULTIPLIER = 3;

/** Score minimal (sur 100) pour entrer dans le vivier — en dessous, la compatibilité réelle (âge, situation matrimoniale, foi...) est trop faible pour justifier une mise en avant. */
const MIN_SCORE = 50;

/** Même viewer + même date (UTC) = même graine = même sélection toute la journée ; elle change automatiquement le lendemain. */
function dailySeed(viewerId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const str = `${viewerId}:${today}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(hash, 31) + str.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed;
  const nextRandom = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sélectionne les `count` profils "recommandés" du jour — tirés au sort
 * parmi le vivier des meilleurs scores de compatibilité (âge, situation
 * matrimoniale, foi, valeurs, localisation...), stable pour un même membre
 * pendant toute la journée, renouvelé automatiquement le lendemain.
 */
export function pickDailyRecommendations(
  profiles: RecommendedProfileItem[],
  viewerId: string,
  count = 3
): { recommended: RecommendedProfileItem[]; others: RecommendedProfileItem[] } {
  if (profiles.length <= count) {
    return { recommended: profiles, others: [] };
  }

  const sortedByScore = [...profiles].sort((a, b) => b.compatibilityPercentage - a.compatibilityPercentage);
  // En dessous de MIN_SCORE, on retombe sur les meilleurs scores disponibles
  // quels qu'ils soient plutôt que de laisser la section vide — mieux vaut
  // montrer les profils les plus proches que rien du tout.
  const qualified = sortedByScore.filter((item) => item.compatibilityPercentage >= MIN_SCORE);
  const candidatePool = qualified.length >= count ? qualified : sortedByScore;
  const poolSize = Math.min(candidatePool.length, count * POOL_MULTIPLIER);
  const pool = candidatePool.slice(0, poolSize);

  const recommended = seededShuffle(pool, dailySeed(viewerId)).slice(0, count);
  const recommendedIds = new Set(recommended.map((item) => item.profile.id));
  const others = profiles.filter((item) => !recommendedIds.has(item.profile.id));

  return { recommended, others };
}
