import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hydrateDiscoverPage, rankDiscoverCandidates, type DiscoverRanking } from "@/domain/services/discover-ranking";
import type { DiscoverFilterCriteria } from "@/domain/types/discover";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Découvrir et l'Accueil : classement fait ici, côté serveur (réseau rapide
 * vers Supabase), au lieu de télécharger tout le vivier (~2 Mo) sur le
 * téléphone. Le navigateur n'envoie que ses filtres et la page voulue, et ne
 * reçoit que les profils affichés. Authentifié par la session cookie du
 * membre : toutes les requêtes passent par sa propre RLS.
 */

/** Durée pendant laquelle un classement est réutilisé (pages suivantes, retour sur Découvrir, Accueil). */
const RANKING_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_RANKINGS = 500;
const MAX_PAGE_SIZE = 50;

// Mémoire de l'instance serveur — perdue au redémarrage, sans conséquence
// (le classement est simplement recalculé). La clé contient le jour : la
// rotation quotidienne de l'ordre n'est jamais figée d'un jour sur l'autre.
const rankingCache = new Map<string, { ranking: DiscoverRanking; expiresAt: number }>();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { filters?: DiscoverFilterCriteria; page?: number; pageSize?: number };
  const filters = body.filters ?? {};
  const page = Math.max(1, Math.floor(Number(body.page) || 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(body.pageSize) || 12)));

  // Même API que le client navigateur attendu par discover-ranking.ts ; conversion directe
  // (une comparaison structurelle des deux types génériques de Supabase épuise la mémoire de TypeScript).
  const db = supabase as unknown as Parameters<typeof rankDiscoverCandidates>[0];

  const { data: viewerRow } = await db.from("profiles").select("*").eq("id", userId).single();
  if (!viewerRow) {
    return NextResponse.json({ recommended: [], otherPage: [], otherTotalCount: 0 });
  }
  const viewer = viewerRow as ProfileRow;

  // Le statut Premium fait partie de la clé : les filtres avancés ne
  // s'appliquent qu'aux abonnés (cf. buildCandidateQuery).
  const cacheKey = `${userId}:${viewer.is_premium}:${new Date().toISOString().slice(0, 10)}:${JSON.stringify(filters)}`;
  const now = Date.now();
  const cached = rankingCache.get(cacheKey);
  let ranking = cached && cached.expiresAt > now ? cached.ranking : null;
  if (!ranking) {
    ranking = await rankDiscoverCandidates(db, viewer, filters);
    if (rankingCache.size >= MAX_CACHED_RANKINGS) {
      for (const [key, entry] of rankingCache) if (entry.expiresAt <= now) rankingCache.delete(key);
      if (rankingCache.size >= MAX_CACHED_RANKINGS) rankingCache.delete(rankingCache.keys().next().value!);
    }
    rankingCache.set(cacheKey, { ranking, expiresAt: now + RANKING_TTL_MS });
  }

  const result = await hydrateDiscoverPage(db, userId, ranking, page, pageSize);
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
