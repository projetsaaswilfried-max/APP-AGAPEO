import type { ProfileRow, ProfilePhotoRow } from "@/lib/supabase/database.types";
import type { UserProfile } from "@/domain/types/user";
import { computeAge, getProfileBadges } from "@/domain/badges";

const STATUS_LABELS: Record<ProfileRow["status"], string> = {
  AVAILABLE: "Disponible",
  IN_DISCUSSION: "En discussion",
  ON_PAUSE: "En pause"
};

interface MapOptions {
  compatibilityPercentage?: number;
  compatibilityReasons?: string[];
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  subscriptionStatus?: UserProfile["subscriptionStatus"];
  subscriptionCurrentPeriodEnd?: string;
  /** Faux par défaut : tant qu'on ne mappe pas explicitement le profil du viewer lui-même, le floutage s'applique. */
  isOwnProfile?: boolean;
}

/**
 * "Flouter mes photos pour le grand public" doit flouter les PIXELS, pas
 * juste l'affichage (cf. bug corrigé : un CSS blur laissait l'URL brute
 * dans la réponse, visible via les outils de développeur). On fait donc
 * transiter l'URL par une route serveur qui applique un vrai flou avant de
 * la servir à quiconque n'est pas le propriétaire de la photo.
 */
export function resolvePhotoUrl(url: string, ownerId: string, isPhotoBlurred: boolean, isOwnProfile: boolean): string {
  if (!url || isOwnProfile || !isPhotoBlurred) return url;
  return `/api/blurred-photo?url=${encodeURIComponent(url)}&owner=${ownerId}`;
}

/**
 * Traduit une ligne `profiles` (schéma plat, cf. supabase/migrations) vers le
 * modèle de vue `UserProfile` (imbriqué) déjà consommé par les composants
 * d'affichage existants — préserve ces composants tels quels plutôt que de
 * les réécrire pour suivre le schéma base de données.
 */
export function mapProfileRowToUserProfile(
  row: ProfileRow,
  photos: ProfilePhotoRow[] = [],
  opts: MapOptions = {}
): UserProfile {
  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];
  const isOwnProfile = opts.isOwnProfile ?? false;
  const rawAvatarUrl = row.avatar_url ?? primaryPhoto?.url ?? "";

  return {
    id: row.id,
    gender: row.gender,
    maritalStatus: row.marital_status,
    firstName: row.first_name,
    lastName: row.last_name,
    email: opts.email,
    phone: opts.phone,
    phoneCountryCode: opts.phoneCountryCode,
    age: computeAge(row.birth_date),
    city: row.city ?? "",
    country: row.country,
    profession: row.profession ?? "",
    educationLevel: row.education_level ?? "",
    languages: row.languages,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    compatibilityPercentage: opts.compatibilityPercentage ?? 0,
    bio: row.bio ?? "",
    quote: row.quote ?? undefined,
    avatarUrl: rawAvatarUrl ? resolvePhotoUrl(rawAvatarUrl, row.id, row.is_photo_blurred, isOwnProfile) : "",
    photos: photos.map((p) => ({
      id: p.id,
      url: resolvePhotoUrl(p.url, row.id, row.is_photo_blurred, isOwnProfile),
      isPrimary: p.is_primary,
      caption: p.caption ?? undefined
    })),
    faith: {
      churchDenomination: row.church_denomination ?? "",
      faithJourneyYears: row.faith_journey_years ?? 0,
      faithDescription: row.faith_description ?? "",
      baptized: row.baptized,
      communityEngagement: row.community_engagement ?? "",
      favoriteVerse: row.favorite_verse ?? undefined,
      testimony: row.testimony ?? undefined,
      currentGodAction: row.current_god_action ?? undefined
    },
    marriageVision: {
      whyMarriage: row.why_marriage ?? "",
      coupleVision: row.couple_vision ?? "",
      familyVision: row.family_vision ?? "",
      desiredChildrenCount: row.desired_children_count ?? "",
      relocationReady: row.relocation_ready,
      timelineYears: row.marriage_timeline ?? "",
      coreValues: row.core_values
    },
    aboutMe: {
      personalityTraits: row.personality_traits,
      passions: row.passions,
      hobbies: row.hobbies,
      qualities: row.qualities,
      likes: row.likes,
      dislikes: row.dislikes
    },
    preferences: {
      desiredAgeMin: row.desired_age_min,
      desiredAgeMax: row.desired_age_max,
      desiredValues: row.desired_values,
      desiredInterests: row.desired_interests,
      desiredCountries: row.desired_countries,
      desiredDenomination: row.desired_denomination ?? undefined,
      desiredMaritalStatuses: row.desired_marital_statuses,
      wantsChildren: row.wants_children ?? undefined
    },
    privacySettings: {
      showOnlineStatus: row.show_online_status,
      showReadReceipts: row.show_read_receipts,
      allowProfileVisits: row.allow_profile_visits,
      isInvisibleProfile: row.is_invisible_profile,
      isPhotoBlurred: row.is_photo_blurred,
      allowEmailNotifications: row.notify_email_digest
    },
    notificationSettings: {
      notifyMessages: row.notify_messages,
      notifyFavorites: row.notify_favorites,
      notifyRecommendations: row.notify_recommendations,
      notifyOfficialPosts: row.notify_official_posts,
      notifyComments: row.notify_comments,
      notifyLikes: row.notify_likes,
      notifyEmailDigest: row.notify_email_digest
    },
    compatibilityReasons: opts.compatibilityReasons ?? [],
    personalPublications: [],
    badges: getProfileBadges(row),
    photoVerificationStatus: row.photo_verification_status,
    subscriptionStatus: opts.subscriptionStatus,
    subscriptionCurrentPeriodEnd: opts.subscriptionCurrentPeriodEnd,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at
  };
}
