import { RecommendedProfileItem, DiscoverFilterCriteria, DiscoverPageResult } from "../types/discover";
import { createClient } from "@/lib/supabase/client";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { computeAge } from "@/domain/badges";
import { pickDailyRecommendations } from "@/domain/daily-recommendations";
import { PremiumRequiredError, VerificationRequiredError, isRlsViolation } from "@/domain/errors";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

export interface IDiscoverService {
  getProfiles(filters?: DiscoverFilterCriteria): Promise<RecommendedProfileItem[]>;
  /** Utilisée par la page Découvrir — ne charge et n'hydrate (profil complet + photos) que les profils réellement affichés (recommandés + page courante), jamais l'ensemble des candidats. Cf. commentaire sur getDiscoverPage plus bas. */
  getDiscoverPage(filters: DiscoverFilterCriteria, page: number, pageSize: number): Promise<DiscoverPageResult>;
  getRecommendations(): Promise<RecommendedProfileItem[]>;
  getFavorites(): Promise<RecommendedProfileItem[]>;
  getWhoLikesMe(): Promise<RecommendedProfileItem[]>;
  /** Nombre de personnes intéressées, consultable par tout le monde — seul le détail (identité) est réservé Premium. */
  getWhoLikesMeCount(): Promise<number>;
  toggleFavorite(profileId: string): Promise<boolean>;
  toggleLike(profileId: string): Promise<boolean>;
}

function birthDateFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

// Plage appliquée à tout compte non-Premium, quoi qu'il transmette lui-même
// (cf. getProfiles) — doit rester identique à DEFAULT_FILTERS dans
// discover/page.tsx, la seule vue qu'un compte gratuit peut voir désormais.
const DEFAULT_AGE_MIN = 20;
const DEFAULT_AGE_MAX = 50;

// Colonnes suffisantes pour classer les candidats (compatibilité + mise en
// avant Premium) SANS télécharger le profil complet ni les photos — cf.
// getDiscoverPage. Doit couvrir exactement les champs lus par
// computeCompatibility (compatibility.ts) plus is_premium/last_active_at.
const RANKING_COLUMNS =
  "id, is_premium, last_active_at, birth_date, country, desired_countries, desired_age_min, desired_age_max, church_denomination, faith_engagement_level, core_values, hobbies, marital_status, desired_marital_statuses";

class DiscoverServiceSupabase implements IDiscoverService {
  /**
   * Construit la requête de candidats partagée par getProfiles (profil
   * complet, tous les candidats) et getDiscoverPage (colonnes de classement
   * uniquement) — mêmes critères d'éligibilité et mêmes filtres de
   * recherche dans les deux cas, seule la projection de colonnes change.
   */
  private buildCandidateQuery<T>(supabase: ReturnType<typeof createClient>, viewer: ProfileRow, filters: DiscoverFilterCriteria, selectColumns: string) {
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
      .order("last_active_at", { ascending: false })
      // Un plafond de 500 coupait silencieusement la liste dès que la
      // communauté dépassait ce nombre de profils vérifiés (signalé : 80+
      // hommes vérifiés réels, seuls 60 visibles depuis un compte femme, avec
      // un plafond alors fixé à 60) — Découvrir doit montrer TOUS les profils
      // vérifiés correspondant au genre recherché, du plus proche au plus
      // éloigné (le tri par compatibilité s'applique de toute façon après
      // coup, sur l'ensemble récupéré ici — cf. getDiscoverPage, qui ne
      // télécharge que la version légère de cet ensemble). Ce plafond n'est
      // qu'un garde-fou contre une requête réellement illimitée, pas une
      // limite voulue à ce stade de la communauté.
      .limit(500);

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

    return query.overrideTypes<T[]>();
  }

  async getProfiles(filters: DiscoverFilterCriteria = {}): Promise<RecommendedProfileItem[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return [];
    const viewer = viewerRow as ProfileRow;

    const { data: candidates, error } = await this.buildCandidateQuery<ProfileRow>(supabase, viewer, filters, "*");
    if (error || !candidates || candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.id);

    const [{ data: photos }, { data: favorites }, { data: likes }] = await Promise.all([
      supabase.from("profile_photos").select("*").in("profile_id", candidateIds),
      supabase.from("favorites").select("favorite_profile_id").eq("user_id", viewer.id),
      supabase.from("profile_likes").select("liked_profile_id").eq("user_id", viewer.id)
    ]);

    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });
    const favoriteIds = new Set((favorites ?? []).map((f) => f.favorite_profile_id));
    const likedIds = new Set((likes ?? []).map((l) => l.liked_profile_id));

    const items: RecommendedProfileItem[] = candidates.map((row) => {
      const candidate = row as ProfileRow;
      const { score, reasons } = computeCompatibility(viewer, candidate);
      const profile = mapProfileRowToUserProfile(candidate, photosByProfile.get(candidate.id) ?? [], {
        compatibilityPercentage: score,
        compatibilityReasons: reasons
      });

      return {
        profile,
        compatibilityPercentage: score,
        status: candidate.status,
        statusLabel: profile.statusLabel,
        justifications: reasons,
        isFavorite: favoriteIds.has(candidate.id),
        isLiked: likedIds.has(candidate.id),
        isPremium: candidate.is_premium
      };
    });

    // Les membres Premium sont mis en avant — priorisés avant le tri par compatibilité.
    return items.sort((a, b) => Number(b.isPremium) - Number(a.isPremium) || b.compatibilityPercentage - a.compatibilityPercentage);
  }

  /**
   * Utilisée par la page Découvrir — corrige un vrai problème de
   * performance : getProfiles() télécharge le profil COMPLET (toutes
   * colonnes) et TOUTES les photos de chaque candidat éligible (300-400+
   * réellement, vérifié en base le 2026-09-05), alors que Découvrir n'en
   * affiche que 3 + 12 à la fois (pagination "Autres profils"). Ici, une
   * première passe légère (RANKING_COLUMNS, sans photos) sert uniquement à
   * calculer la compatibilité et l'ordre d'affichage pour l'ENSEMBLE des
   * candidats (pour ne rien changer au classement existant : "Recommandée
   * pour vous" doit rester tiré du meilleur de tout le vivier, pas seulement
   * de la page courante) — seuls les profils réellement affichés
   * (recommandés + page demandée) sont ensuite hydratés en entier (profil
   * complet + photos).
   */
  async getDiscoverPage(filters: DiscoverFilterCriteria = {}, page: number, pageSize: number): Promise<DiscoverPageResult> {
    const empty: DiscoverPageResult = { recommended: [], otherPage: [], otherTotalCount: 0 };
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return empty;

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return empty;
    const viewer = viewerRow as ProfileRow;

    const { data: lightRows, error } = await this.buildCandidateQuery<ProfileRow>(supabase, viewer, filters, RANKING_COLUMNS);
    if (error || !lightRows || lightRows.length === 0) return empty;

    interface RankedCandidate {
      profile: { id: string };
      compatibilityPercentage: number;
      reasons: string[];
      isPremium: boolean;
      age: number;
    }

    // `row` ne porte réellement que RANKING_COLUMNS malgré le cast ProfileRow
    // (même convention que candidates.map ci-dessus) — computeCompatibility
    // ne lit que des champs couverts par cette sélection.
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

    // Même tri que getProfiles (Premium d'abord, puis compatibilité) — c'est
    // cet ordre qui définit la page "Autres profils" une fois les 3
    // recommandés retirés.
    ranked.sort((a, b) => Number(b.isPremium) - Number(a.isPremium) || b.compatibilityPercentage - a.compatibilityPercentage);

    // "Recommandée pour vous" exige que le CANDIDAT tombe dans la tranche
    // d'âge que LE membre connecté recherche — condition stricte, pas
    // seulement un critère de score parmi d'autres (sinon un profil très
    // bien assorti sur la foi peut sortir 15 ans hors de l'âge demandé).
    const ageEligible = ranked.filter((c) => c.age >= viewer.desired_age_min && c.age <= viewer.desired_age_max);
    const recommendationPool = ageEligible.length > 0 ? ageEligible : ranked;
    const { recommended: recommendedLight } = pickDailyRecommendations(recommendationPool, viewer.id, 3);
    const recommendedIds = new Set(recommendedLight.map((c) => c.profile.id));

    const others = ranked.filter((c) => !recommendedIds.has(c.profile.id));
    const otherTotalCount = others.length;
    const pageLight = others.slice((page - 1) * pageSize, page * pageSize);

    const idsToHydrate = [...recommendedLight.map((c) => c.profile.id), ...pageLight.map((c) => c.profile.id)];
    if (idsToHydrate.length === 0) return { recommended: [], otherPage: [], otherTotalCount };

    const [{ data: fullProfiles }, { data: photos }, { data: favorites }, { data: likes }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", idsToHydrate),
      supabase.from("profile_photos").select("*").in("profile_id", idsToHydrate),
      supabase.from("favorites").select("favorite_profile_id").eq("user_id", viewer.id),
      supabase.from("profile_likes").select("liked_profile_id").eq("user_id", viewer.id)
    ]);

    const fullById = new Map<string, ProfileRow>((fullProfiles as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });
    const favoriteIds = new Set((favorites ?? []).map((f) => f.favorite_profile_id));
    const likedIds = new Set((likes ?? []).map((l) => l.liked_profile_id));

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

  async getRecommendations(): Promise<RecommendedProfileItem[]> {
    const items = (await this.getProfiles()).filter((item) => item.compatibilityPercentage >= 85);
    await this.notifyNewRecommendations(items);
    return items;
  }

  /** Notifie les nouvelles recommandations fortes non encore vues (dédupliqué), sans job planifié. */
  private async notifyNewRecommendations(items: RecommendedProfileItem[]) {
    if (items.length === 0) return;
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("notifications")
      .select("actor_id")
      .eq("recipient_id", user.id)
      .eq("type", "NEW_RECOMMENDATION");

    const alreadyNotified = new Set((existing ?? []).map((n) => n.actor_id));
    const fresh = items.filter((item) => !alreadyNotified.has(item.profile.id)).slice(0, 5);
    if (fresh.length === 0) return;

    await Promise.all(
      fresh.map((item) =>
        supabase.from("notifications").insert({
          recipient_id: user.id,
          actor_id: item.profile.id,
          type: "NEW_RECOMMENDATION",
          title: `${item.profile.firstName} vous est recommandé(e) à ${item.compatibilityPercentage}%`,
          body: item.justifications[0] ?? null,
          target_url: "/discover"
        })
      )
    );
  }

  async getFavorites(): Promise<RecommendedProfileItem[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return [];
    const viewer = viewerRow as ProfileRow;

    const { data: favoriteRows } = await supabase.from("favorites").select("favorite_profile_id").eq("user_id", user.id);
    const favoriteIds = (favoriteRows ?? []).map((f) => f.favorite_profile_id);
    if (favoriteIds.length === 0) return [];

    const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";

    // Liste blanche stricte (VERIFIED uniquement) — même règle que Découvrir.
    // Un profil favori qui perd son statut VERIFIED (photo jamais soumise,
    // en cours d'examen, ou refusée) disparaît de la liste tant qu'il n'est
    // pas (re)validé. Le filtre de genre est une double sécurité (déjà
    // appliqué à la création côté RLS/RPC, cf. migration
    // strict_opposite_gender_matching) — sans effet aujourd'hui (aucune
    // ligne du mauvais genre en base au moment de ce correctif) mais empêche
    // qu'une entrée du mauvais genre ne s'affiche si elle apparaissait un jour.
    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .in("id", favoriteIds)
      .eq("gender", targetGender)
      .eq("is_staff", false)
      .eq("photo_verification_status", "VERIFIED");
    if (!candidates || candidates.length === 0) return [];

    const [{ data: photos }, { data: likes }] = await Promise.all([
      supabase.from("profile_photos").select("*").in("profile_id", favoriteIds),
      supabase.from("profile_likes").select("liked_profile_id").eq("user_id", user.id)
    ]);
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });
    const likedIds = new Set((likes ?? []).map((l) => l.liked_profile_id));

    return candidates.map((row) => {
      const candidate = row as ProfileRow;
      const { score, reasons } = computeCompatibility(viewer, candidate);
      const profile = mapProfileRowToUserProfile(candidate, photosByProfile.get(candidate.id) ?? [], {
        compatibilityPercentage: score,
        compatibilityReasons: reasons
      });
      return {
        profile,
        compatibilityPercentage: score,
        status: candidate.status,
        statusLabel: profile.statusLabel,
        justifications: reasons,
        isFavorite: true,
        isLiked: likedIds.has(candidate.id),
        isPremium: candidate.is_premium
      };
    });
  }

  /**
   * Membres ayant consulté, mis en favori, ou liké mon profil — fonctionnalité
   * Premium. Le détail (identité, photo) n'est renvoyé qu'aux membres
   * Premium/équipe ; un membre gratuit doit passer par `getWhoLikesMeCount()`
   * pour le nombre seul. Contrôle fait ici côté serveur (pas seulement
   * masqué dans l'UI) pour qu'un appel direct ne puisse pas contourner Premium.
   */
  async getWhoLikesMe(): Promise<RecommendedProfileItem[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return [];
    const viewer = viewerRow as ProfileRow;
    if (!viewer.is_premium && !viewer.is_staff) return [];

    const [{ data: favoritedByRows }, { data: viewedByRows }, { data: likedByRows }, { data: myFavoriteRows }, { data: myLikeRows }] =
      await Promise.all([
        supabase.from("favorites").select("user_id").eq("favorite_profile_id", user.id),
        supabase.from("profile_views").select("viewer_id").eq("viewed_profile_id", user.id),
        supabase.from("profile_likes").select("user_id").eq("liked_profile_id", user.id),
        supabase.from("favorites").select("favorite_profile_id").eq("user_id", user.id),
        supabase.from("profile_likes").select("liked_profile_id").eq("user_id", user.id)
      ]);

    const candidateIds = [
      ...new Set([
        ...(favoritedByRows ?? []).map((r) => r.user_id),
        ...(viewedByRows ?? []).map((r) => r.viewer_id),
        ...(likedByRows ?? []).map((r) => r.user_id)
      ])
    ];
    if (candidateIds.length === 0) return [];

    const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";

    // Même liste blanche VERIFIED que Découvrir/Favoris : ne pas présenter un
    // profil non validé, même dans "qui s'intéresse à moi". Filtre de genre :
    // double sécurité, cf. commentaire équivalent dans getFavorites().
    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .in("id", candidateIds)
      .eq("gender", targetGender)
      .eq("is_staff", false)
      .eq("photo_verification_status", "VERIFIED");
    if (!candidates || candidates.length === 0) return [];

    const { data: photos } = await supabase.from("profile_photos").select("*").in("profile_id", candidateIds);
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });

    const myFavoriteIds = new Set((myFavoriteRows ?? []).map((r) => r.favorite_profile_id));
    const myLikeIds = new Set((myLikeRows ?? []).map((r) => r.liked_profile_id));

    return candidates
      .map((row) => {
        const candidate = row as ProfileRow;
        const { score, reasons } = computeCompatibility(viewer, candidate);
        const profile = mapProfileRowToUserProfile(candidate, photosByProfile.get(candidate.id) ?? [], {
          compatibilityPercentage: score,
          compatibilityReasons: reasons
        });
        return {
          profile,
          compatibilityPercentage: score,
          status: candidate.status,
          statusLabel: profile.statusLabel,
          justifications: reasons,
          isFavorite: myFavoriteIds.has(candidate.id),
          isLiked: myLikeIds.has(candidate.id),
          isPremium: candidate.is_premium
        };
      })
      .sort((a, b) => b.compatibilityPercentage - a.compatibilityPercentage);
  }

  /** Nombre de personnes intéressées, sans exposer leur identité — accessible à tous, y compris en gratuit. */
  async getWhoLikesMeCount(): Promise<number> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: viewerRow } = await supabase.from("profiles").select("gender").eq("id", user.id).single();
    if (!viewerRow) return 0;
    const targetGender = viewerRow.gender === "MALE" ? "FEMALE" : "MALE";

    const [{ data: favoritedByRows }, { data: viewedByRows }, { data: likedByRows }] = await Promise.all([
      supabase.from("favorites").select("user_id").eq("favorite_profile_id", user.id),
      supabase.from("profile_views").select("viewer_id").eq("viewed_profile_id", user.id),
      supabase.from("profile_likes").select("user_id").eq("liked_profile_id", user.id)
    ]);

    const candidateIds = [
      ...new Set([
        ...(favoritedByRows ?? []).map((r) => r.user_id),
        ...(viewedByRows ?? []).map((r) => r.viewer_id),
        ...(likedByRows ?? []).map((r) => r.user_id)
      ])
    ];
    if (candidateIds.length === 0) return 0;

    // Même liste blanche que getWhoLikesMe() : le compte doit correspondre à
    // ce qui sera effectivement affiché en détail (VERIFIED + bon genre).
    const { data: visibleCandidates } = await supabase
      .from("profiles")
      .select("id")
      .in("id", candidateIds)
      .eq("gender", targetGender)
      .eq("is_staff", false)
      .eq("photo_verification_status", "VERIFIED");

    return visibleCandidates?.length ?? 0;
  }

  async toggleFavorite(profileId: string): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    // Vérifié en amont (message d'erreur précis) plutôt que de laisser la
    // RLS renvoyer une violation générique qu'on ne pourrait pas distinguer
    // d'un blocage Premium.
    const { data: viewerRow } = await supabase.from("profiles").select("photo_verification_status, is_staff").eq("id", user.id).single();
    if (viewerRow && viewerRow.photo_verification_status !== "VERIFIED" && !viewerRow.is_staff) {
      throw new VerificationRequiredError("Valide ton profil pour mettre des membres en favori.");
    }

    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("favorite_profile_id", profileId)
      .maybeSingle();

    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return false;
    }

    const { error } = await supabase.from("favorites").insert({ user_id: user.id, favorite_profile_id: profileId });
    if (isRlsViolation(error)) throw new PremiumRequiredError("Passe Premium pour mettre des profils en favori.");
    if (error) throw new Error(error.message);
    return true;
  }

  /**
   * Action gratuite (contrairement à toggleFavorite, jamais réservée
   * Premium) — c'est justement le volume de likes gratuits qui alimente les
   * notifications anonymisées faisant découvrir Premium (cf. migration
   * profile_likes). Seule la vérification de profil est exigée.
   */
  async toggleLike(profileId: string): Promise<boolean> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Session expirée.");

    const { data: viewerRow } = await supabase.from("profiles").select("photo_verification_status, is_staff").eq("id", user.id).single();
    if (viewerRow && viewerRow.photo_verification_status !== "VERIFIED" && !viewerRow.is_staff) {
      throw new VerificationRequiredError("Valide ton profil pour liker un membre.");
    }

    const { data: existing } = await supabase
      .from("profile_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("liked_profile_id", profileId)
      .maybeSingle();

    if (existing) {
      await supabase.from("profile_likes").delete().eq("id", existing.id);
      return false;
    }

    const { error } = await supabase.from("profile_likes").insert({ user_id: user.id, liked_profile_id: profileId });
    if (error) throw new Error(error.message);
    return true;
  }
}

export const discoverService = new DiscoverServiceSupabase();
