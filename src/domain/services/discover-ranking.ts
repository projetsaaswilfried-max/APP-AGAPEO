// Import de type uniquement (effacé à la compilation) : ce module reste utilisable côté serveur.
import type { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DiscoverFilterCriteria, DiscoverPageResult, RecommendedProfileItem } from "../types/discover";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { computeAge } from "@/domain/badges";
import { orderByCompatibilityWithDailyRotation, pickDailyRecommendations } from "@/domain/daily-recommendations";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

/** Même type que les clients navigateur/serveur du projet (non paramétrés par Database, cf. lib/supabase/client.ts) — le type générique SupabaseClient fait exploser l'inférence TypeScript. */
type DbClient = ReturnType<typeof createBrowserSupabaseClient>;

/*
 * Classement de Découvrir, isomorphe (aucun client Supabase importé ici : il
 * est toujours passé en paramètre). Exécuté côté SERVEUR par la route
 * /api/discover pour la page Découvrir et l'Accueil : le serveur télécharge
 * et classe tout le vivier (plusieurs milliers de profils, ~2 Mo de colonnes
 * de classement) sur un réseau rapide, et le téléphone ne reçoit plus que
 * les profils réellement affichés. getProfiles (discover.service.ts)
 * réutilise les mêmes requêtes côté navigateur.
 */


function birthDateFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

// Plage appliquée à tout compte non-Premium, quoi qu'il transmette lui-même
// (cf. getProfiles) — doit rester identique à DEFAULT_FILTERS dans
// discover/page.tsx, la seule vue qu'un compte gratuit peut voir désormais.
export const DEFAULT_AGE_MIN = 20;
export const DEFAULT_AGE_MAX = 50;

// Colonnes suffisantes pour classer les candidats (compatibilité + mise en
// avant Premium) SANS télécharger le profil complet ni les photos — cf.
// getDiscoverPage. Doit couvrir exactement les champs lus par
// computeCompatibility (compatibility.ts) plus is_premium/last_active_at.
export const RANKING_COLUMNS =
  "id, is_premium, last_active_at, birth_date, country, desired_countries, desired_age_min, desired_age_max, church_denomination, faith_engagement_level, core_values, hobbies, marital_status, desired_marital_statuses";

/**
 * Construit la requête de candidats partagée par getProfiles (profil
 * complet, tous les candidats) et getDiscoverPage (colonnes de classement
 * uniquement) — mêmes critères d'éligibilité et mêmes filtres de
 * recherche dans les deux cas, seule la projection de colonnes change.
 */
// Non exportée (comme la méthode privée d'origine) : son type de retour, un constructeur de requête
// Supabase entièrement générique, ferait exploser la mémoire de TypeScript en mode incrémental s'il
// faisait partie de la signature publique du module.
function buildCandidateQuery<T>(
  supabase: DbClient,
  viewer: ProfileRow,
  filters: DiscoverFilterCriteria,
  selectColumns: string,
  range: readonly [number, number]
) {
  const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";

  // Un profil n'est proposé aux autres que lorsqu'il est "actif" (cf.
  // isProfileComplete côté client) — indépendant de `onboarding_completed`,
  // qui ne fait que suivre si l'assistant d'inscription a été vu/quitté.
  // Liste blanche stricte (VERIFIED uniquement), jamais une liste noire :
  // `.not(...,"in","(PENDING,REJECTED)")` laissait passer UNVERIFIED (photo
  // jamais soumise) — bug réel trouvé en prod où des profils n'ayant ni
  // soumis ni obtenu de validation apparaissaient dans Découvrir.
  let query = supabase
    .from("profiles")
    .select(selectColumns)
    .neq("id", viewer.id)
    .eq("gender", targetGender)
    .eq("is_staff", false)
    .not("avatar_url", "is", null)
    .not("church_denomination", "is", null)
    .not("why_marriage", "is", null)
    .eq("photo_verification_status", "VERIFIED")
    .eq("is_matched", false)
    .order("last_active_at", { ascending: false });

  // Recherche et filtres (y compris la "recherche de base" âge/pays/statut,
  // désormais réservée Premium elle aussi) — appliqués ici côté serveur
  // (pas seulement désactivés dans l'UI) pour qu'un appel direct au service
  // ne puisse pas contourner la restriction. Un compte non-Premium reçoit
  // systématiquement la plage d'âge par défaut, jamais ce qu'il a pu
  // transmettre lui-même.
  const canUseAdvancedFilters = viewer.is_premium || viewer.is_staff;

  if (canUseAdvancedFilters && filters.searchQuery?.trim()) {
    const q = filters.searchQuery.trim();
    query = query.or(`first_name.ilike.%${q}%,city.ilike.%${q}%,profession.ilike.%${q}%,country.ilike.%${q}%`);
  }

  const ageMax = canUseAdvancedFilters ? (filters.ageMax ?? DEFAULT_AGE_MAX) : DEFAULT_AGE_MAX;
  const ageMin = canUseAdvancedFilters ? (filters.ageMin ?? DEFAULT_AGE_MIN) : DEFAULT_AGE_MIN;
  query = query.gte("birth_date", birthDateFromAge(ageMax + 1)).lte("birth_date", birthDateFromAge(ageMin));
  if (canUseAdvancedFilters && filters.country) query = query.eq("country", filters.country);
  if (canUseAdvancedFilters && filters.status && filters.status !== "ALL") query = query.eq("status", filters.status as ProfileRow["status"]);

  // La situation matrimoniale acceptée n'exclut plus personne de la
  // requête — c'est désormais un critère de score (cf. compatibility.ts),
  // pas un filtre strict. Qui veut vraiment restreindre là-dessus peut
  // utiliser le filtre de recherche ci-dessous.
  if (canUseAdvancedFilters && filters.maritalStatus) query = query.eq("marital_status", filters.maritalStatus);

  if (canUseAdvancedFilters) {
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.profession) query = query.ilike("profession", `%${filters.profession}%`);
    if (filters.educationLevel) query = query.eq("education_level", filters.educationLevel);
    if (filters.denomination) query = query.eq("church_denomination", filters.denomination);
    if (filters.faithEngagementLevel) query = query.eq("faith_engagement_level", filters.faithEngagementLevel);
    if (filters.ministry) query = query.ilike("ministry", `%${filters.ministry}%`);
    if (filters.language) query = query.contains("languages", [filters.language]);
    if (filters.hasChildren !== undefined) query = query.eq("has_children", filters.hasChildren);
    if (filters.wantsChildren !== undefined) query = query.eq("wants_children", filters.wantsChildren);
    if (filters.coreValue) query = query.contains("core_values", [filters.coreValue]);
  }

  return query.range(range[0], range[1]).overrideTypes<T[]>();
}


/**
 * buildCandidateQuery n'impose plus aucun plafond — un plafond fixe (500,
 * déjà relevé une fois depuis 60 pour la même raison) finit toujours par
 * retronquer silencieusement Découvrir dès que la communauté grandit
 * (signalé : "Autres profils" bloqué à 497 alors que plus de 500 femmes
 * étaient déjà vérifiées). On récupère donc l'ensemble du vivier par pages
 * de PAGE_SIZE (le plafond réel par requête côté PostgREST, cf. fetchAllRows
 * dans lib/supabase/admin.ts pour le même constat côté admin), en lots
 * parallèles de taille croissante — sans limite sur le nombre total de
 * candidats, que la communauté en compte 500 ou 100 000.
 */
export async function fetchAllCandidates<T>(
  supabase: DbClient,
  viewer: ProfileRow,
  filters: DiscoverFilterCriteria,
  selectColumns: string
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const fetchPage = async (page: number): Promise<T[]> => {
    const from = page * PAGE_SIZE;
    const { data } = await buildCandidateQuery<T>(supabase, viewer, filters, selectColumns, [from, from + PAGE_SIZE - 1]);
    return (data ?? []) as T[];
  };

  const firstPage = await fetchPage(0);
  if (firstPage.length < PAGE_SIZE) return firstPage;

  const all = [...firstPage];
  let nextPage = 1;
  // Premier lot de 4 pages en parallèle (jusqu'à 5 000 profils en 2 allers-retours au lieu de 3-4) ;
  // une page vide de trop ne coûte presque rien, un aller-retour séquentiel de plus coûte une latence entière.
  let batchSize = 4;
  while (true) {
    const pages = await Promise.all(Array.from({ length: batchSize }, (_, i) => fetchPage(nextPage + i)));
    pages.forEach((p) => all.push(...p));
    if (pages.some((p) => p.length < PAGE_SIZE)) break;
    nextPage += batchSize;
    batchSize *= 2;
  }
  return all;
}


interface RankedCandidate {
  profile: { id: string };
  compatibilityPercentage: number;
  reasons: string[];
  isPremium: boolean;
  age: number;
}

/** Résultat du classement complet d'un membre : ordre d'affichage + 3 recommandés du jour. Mis en cache par la route /api/discover. */
export interface DiscoverRanking {
  recommended: RankedCandidate[];
  others: RankedCandidate[];
}

/**
 * Classe tout le vivier pour ce membre (colonnes légères uniquement) : par
 * palier de compatibilité avec rotation quotidienne (cf.
 * daily-recommendations.ts), puis tire les 3 "Recommandée pour vous" parmi
 * les profils dans la tranche d'âge recherchée.
 */
export async function rankDiscoverCandidates(supabase: DbClient, viewer: ProfileRow, filters: DiscoverFilterCriteria): Promise<DiscoverRanking> {
  const lightRows = await fetchAllCandidates<ProfileRow>(supabase, viewer, filters, RANKING_COLUMNS);
  if (lightRows.length === 0) return { recommended: [], others: [] };

  // `row` ne porte réellement que RANKING_COLUMNS malgré le cast ProfileRow —
  // computeCompatibility ne lit que des champs couverts par cette sélection.
  const ranked: RankedCandidate[] = lightRows.map((row) => {
    const { score, reasons } = computeCompatibility(viewer, row);
    return {
      profile: { id: row.id },
      compatibilityPercentage: score,
      reasons,
      isPremium: row.is_premium,
      age: computeAge(row.birth_date)
    };
  });

  // Par palier de compatibilité, Premium d'abord dans chaque palier, et un
  // ordre qui tourne chaque jour à l'intérieur — c'est cet ordre qui définit
  // "Autres profils" une fois les 3 recommandés retirés.
  const ordered = orderByCompatibilityWithDailyRotation(ranked, viewer.id);

  // "Recommandée pour vous" exige que le CANDIDAT tombe dans la tranche
  // d'âge que LE membre connecté recherche — condition stricte, pas
  // seulement un critère de score parmi d'autres.
  const ageEligible = ordered.filter((c) => c.age >= viewer.desired_age_min && c.age <= viewer.desired_age_max);
  const recommendationPool = ageEligible.length > 0 ? ageEligible : ordered;
  const { recommended } = pickDailyRecommendations(recommendationPool, viewer.id, 3);
  const recommendedIds = new Set(recommended.map((c) => c.profile.id));

  return { recommended, others: ordered.filter((c) => !recommendedIds.has(c.profile.id)) };
}

/** Hydrate (profil complet + photos + favori/like) uniquement les recommandés et la page demandée. */
export async function hydrateDiscoverPage(
  supabase: DbClient,
  viewerId: string,
  ranking: DiscoverRanking,
  page: number,
  pageSize: number
): Promise<DiscoverPageResult> {
  const otherTotalCount = ranking.others.length;
  const pageLight = ranking.others.slice((page - 1) * pageSize, page * pageSize);
  const recommendedLight = ranking.recommended;

  const idsToHydrate = [...recommendedLight.map((c) => c.profile.id), ...pageLight.map((c) => c.profile.id)];
  if (idsToHydrate.length === 0) return { recommended: [], otherPage: [], otherTotalCount };

  const [{ data: fullProfiles }, { data: photos }, { data: favorites }, { data: likes }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", idsToHydrate),
    supabase.from("profile_photos").select("*").in("profile_id", idsToHydrate),
    supabase.from("favorites").select("favorite_profile_id").eq("user_id", viewerId),
    supabase.from("profile_likes").select("liked_profile_id").eq("user_id", viewerId)
  ]);

  const fullById = new Map<string, ProfileRow>(((fullProfiles as ProfileRow[] | null) ?? []).map((p) => [p.id, p]));
  const photosByProfile = new Map<string, ProfilePhotoRow[]>();
  ((photos as ProfilePhotoRow[] | null) ?? []).forEach((p) => {
    const list = photosByProfile.get(p.profile_id) ?? [];
    list.push(p);
    photosByProfile.set(p.profile_id, list);
  });
  const favoriteIds = new Set(((favorites as { favorite_profile_id: string }[] | null) ?? []).map((f) => f.favorite_profile_id));
  const likedIds = new Set(((likes as { liked_profile_id: string }[] | null) ?? []).map((l) => l.liked_profile_id));

  const hydrate = (light: RankedCandidate): RecommendedProfileItem | null => {
    const candidate = fullById.get(light.profile.id);
    if (!candidate) return null;
    const profile = mapProfileRowToUserProfile(candidate, photosByProfile.get(candidate.id) ?? [], {
      compatibilityPercentage: light.compatibilityPercentage,
      compatibilityReasons: light.reasons
    });
    return {
      profile,
      compatibilityPercentage: light.compatibilityPercentage,
      status: candidate.status,
      statusLabel: profile.statusLabel,
      justifications: light.reasons,
      isFavorite: favoriteIds.has(candidate.id),
      isLiked: likedIds.has(candidate.id),
      isPremium: candidate.is_premium
    };
  };

  return {
    recommended: recommendedLight.map(hydrate).filter((x): x is RecommendedProfileItem => x !== null),
    otherPage: pageLight.map(hydrate).filter((x): x is RecommendedProfileItem => x !== null),
    otherTotalCount
  };
}
