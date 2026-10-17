import { RecommendedProfileItem, DiscoverFilterCriteria, DiscoverPageResult } from "../types/discover";
import { createClient } from "@/lib/supabase/client";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { fetchAllCandidates } from "@/domain/services/discover-ranking";
import { PremiumRequiredError, VerificationRequiredError, isRlsViolation } from "@/domain/errors";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";
import { getSessionUser } from "@/lib/supabase/session-user";

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
class DiscoverServiceSupabase implements IDiscoverService {
  async getProfiles(filters: DiscoverFilterCriteria = {}): Promise<RecommendedProfileItem[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await getSessionUser(supabase);
    if (!user) return [];

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return [];
    const viewer = viewerRow as ProfileRow;

    const candidates = await fetchAllCandidates<ProfileRow>(supabase, viewer, filters, "*");
    if (candidates.length === 0) return [];

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
   * Classement fait côté serveur (route /api/discover, cf.
   * discover-ranking.ts) : le téléphone ne télécharge plus tout le vivier
   * (plusieurs milliers de profils), seulement les 3 recommandés + la page
   * demandée, déjà classés et hydratés.
   */
  async getDiscoverPage(filters: DiscoverFilterCriteria = {}, page: number, pageSize: number): Promise<DiscoverPageResult> {
    const response = await fetch("/api/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters, page, pageSize })
    });
    if (response.status === 401) return { recommended: [], otherPage: [], otherTotalCount: 0 };
    if (!response.ok) throw new Error("Impossible de charger les profils.");
    return (await response.json()) as DiscoverPageResult;
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
    } = await getSessionUser(supabase);
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
    } = await getSessionUser(supabase);
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
    } = await getSessionUser(supabase);
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
    } = await getSessionUser(supabase);
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
    } = await getSessionUser(supabase);
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
    } = await getSessionUser(supabase);
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
