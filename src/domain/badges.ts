import type { ProfileRow } from "@/lib/supabase/database.types";
import type { UserBadge } from "@/domain/types/user";

/**
 * Les badges ne sont jamais stockés tels quels : ils sont dérivés des
 * statuts de vérification réels de la base (jamais simulés côté client).
 */
export function getProfileBadges(profile: Pick<ProfileRow, "email_verified" | "phone_verified" | "photo_verification_status">): UserBadge[] {
  const badges: UserBadge[] = [];

  if (profile.photo_verification_status === "VERIFIED") {
    badges.push({ id: "VERIFIED_FAITH", code: "VERIFIED_FAITH", label: "Photo vérifiée", icon: "ShieldCheck" });
  }

  if (profile.email_verified && profile.phone_verified && profile.photo_verification_status === "VERIFIED") {
    badges.push({ id: "IDENTITY_VERIFIED", code: "IDENTITY_VERIFIED", label: "Identité vérifiée", icon: "BadgeCheck" });
  }

  return badges;
}

export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function computeAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
