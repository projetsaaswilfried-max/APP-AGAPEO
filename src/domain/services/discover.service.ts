import { RecommendedProfileItem, DiscoverFilterCriteria } from "../types/discover";
import { createClient } from "@/lib/supabase/client";
import { mapProfileRowToUserProfile } from "@/domain/mappers/profile.mapper";
import { computeCompatibility } from "@/domain/matching/compatibility";
import { PremiumRequiredError, VerificationRequiredError, isRlsViolation } from "@/domain/errors";
import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";

export interface IDiscoverService {
  getProfiles(filters?: DiscoverFilterCriteria): Promise<RecommendedProfileItem[]>;
  getRecommendations(): Promise<RecommendedProfileItem[]>;
  getFavorites(): Promise<RecommendedProfileItem[]>;
  getWhoLikesMe(): Promise<RecommendedProfileItem[]>;
  /** Nombre de personnes intéressées, consultable par tout le monde — seul le détail (identité) est réservé Premium. */
  getWhoLikesMeCount(): Promise<number>;
  toggleFavorite(profileId: string): Promise<boolean>;
}

function birthDateFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
}

class DiscoverServiceSupabase implements IDiscoverService {
  async getProfiles(filters: DiscoverFilterCriteria = {}): Promise<RecommendedProfileItem[]> {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: viewerRow } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!viewerRow) return [];
    const viewer = viewerRow as ProfileRow;

    const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";

    // Un profil n'est proposé aux autres que lorsqu'il est "actif" (cf.
    // isProfileComplete côté client) — indépendant de `onboarding_completed`,
    // qui ne fait que suivre si l'assistant d'inscription a été vu/quitté.
    // PENDING/REJECTED exclus : un profil en cours d'examen ou dont la photo
    // a été refusée par l'équipe ne doit jamais être proposé aux autres
    // membres tant qu'il n'a pas été (re)validé — cf. email "SUBMITTED" qui
    // promet déjà "tant que la vérification est en cours, ton profil n'est
    // pas encore proposé aux autres membres dans Découvrir".
    let query = supabase
      .from("profiles")
      .select("*")
      .neq("id", viewer.id)
      .eq("gender", targetGender)
      .not("avatar_url", "is", null)
      .not("church_denomination", "is", null)
      .not("why_marriage", "is", null)
      .not("photo_verification_status", "in", "(PENDING,REJECTED)")
      .order("last_active_at", { ascending: false })
      .limit(60);

    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.trim();
      query = query.or(`first_name.ilike.%${q}%,city.ilike.%${q}%,profession.ilike.%${q}%,country.ilike.%${q}%`);
    }
    // "Recherche de base" (gratuit) : age, pays, statut. Tout le reste est
    // un "filtre de recherche avancé" reserve Premium sur la page tarifs —
    // applique ici cote serveur (pas seulement desactive dans l'UI) pour
    // qu'un appel direct au service ne puisse pas contourner la restriction.
    if (filters.ageMax) query = query.gte("birth_date", birthDateFromAge(filters.ageMax + 1));
    if (filters.ageMin) query = query.lte("birth_date", birthDateFromAge(filters.ageMin));
    if (filters.country) query = query.eq("country", filters.country);
    if (filters.status && filters.status !== "ALL") query = query.eq("status", filters.status as ProfileRow["status"]);

    const canUseAdvancedFilters = viewer.is_premium || viewer.is_staff;
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
      if (filters.relocationReady !== undefined) query = query.eq("relocation_ready", filters.relocationReady);
      if (filters.passion) query = query.contains("passions", [filters.passion]);
      if (filters.coreValue) query = query.contains("core_values", [filters.coreValue]);
      if (filters.verifiedOnly) query = query.eq("photo_verification_status", "VERIFIED");
    }

    const { data: candidates, error } = await query;
    if (error || !candidates || candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.id);

    const [{ data: photos }, { data: favorites }] = await Promise.all([
      supabase.from("profile_photos").select("*").in("profile_id", candidateIds),
      supabase.from("favorites").select("favorite_profile_id").eq("user_id", viewer.id)
    ]);

    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });
    const favoriteIds = new Set((favorites ?? []).map((f) => f.favorite_profile_id));

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
        isPremium: candidate.is_premium
      };
    });

    // Les membres Premium sont mis en avant — priorisés avant le tri par compatibilité.
    return items.sort((a, b) => Number(b.isPremium) - Number(a.isPremium) || b.compatibilityPercentage - a.compatibilityPercentage);
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

    // Un profil favori qui passe ensuite en PENDING/REJECTED disparaît de la
    // liste tant qu'il n'est pas (re)validé — même raison que dans Découvrir.
    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .in("id", favoriteIds)
      .not("photo_verification_status", "in", "(PENDING,REJECTED)");
    if (!candidates || candidates.length === 0) return [];

    const { data: photos } = await supabase.from("profile_photos").select("*").in("profile_id", favoriteIds);
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });

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
        isPremium: candidate.is_premium
      };
    });
  }

  /**
   * Membres ayant consulté ou mis en favori mon profil — fonctionnalité
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

    const [{ data: favoritedByRows }, { data: viewedByRows }, { data: myFavoriteRows }] = await Promise.all([
      supabase.from("favorites").select("user_id").eq("favorite_profile_id", user.id),
      supabase.from("profile_views").select("viewer_id").eq("viewed_profile_id", user.id),
      supabase.from("favorites").select("favorite_profile_id").eq("user_id", user.id)
    ]);

    const candidateIds = [
      ...new Set([...(favoritedByRows ?? []).map((r) => r.user_id), ...(viewedByRows ?? []).map((r) => r.viewer_id)])
    ];
    if (candidateIds.length === 0) return [];

    // Même exclusion PENDING/REJECTED que Découvrir/Favoris : ne pas
    // présenter un profil non validé, même dans "qui s'intéresse à moi".
    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .in("id", candidateIds)
      .not("photo_verification_status", "in", "(PENDING,REJECTED)");
    if (!candidates || candidates.length === 0) return [];

    const { data: photos } = await supabase.from("profile_photos").select("*").in("profile_id", candidateIds);
    const photosByProfile = new Map<string, ProfilePhotoRow[]>();
    (photos ?? []).forEach((p) => {
      const list = photosByProfile.get(p.profile_id) ?? [];
      list.push(p);
      photosByProfile.set(p.profile_id, list);
    });

    const myFavoriteIds = new Set((myFavoriteRows ?? []).map((r) => r.favorite_profile_id));

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

    const [{ data: favoritedByRows }, { data: viewedByRows }] = await Promise.all([
      supabase.from("favorites").select("user_id").eq("favorite_profile_id", user.id),
      supabase.from("profile_views").select("viewer_id").eq("viewed_profile_id", user.id)
    ]);

    const candidateIds = [...new Set([...(favoritedByRows ?? []).map((r) => r.user_id), ...(viewedByRows ?? []).map((r) => r.viewer_id)])];
    if (candidateIds.length === 0) return 0;

    // Même exclusion que getWhoLikesMe() : le compte doit correspondre à ce
    // qui sera effectivement affiché en détail (profils PENDING/REJECTED exclus).
    const { data: visibleCandidates } = await supabase
      .from("profiles")
      .select("id")
      .in("id", candidateIds)
      .not("photo_verification_status", "in", "(PENDING,REJECTED)");

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
}

export const discoverService = new DiscoverServiceSupabase();
