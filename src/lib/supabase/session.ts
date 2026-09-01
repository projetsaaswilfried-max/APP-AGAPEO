import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { ProfileRow, ProfileRestrictedRow } from "./database.types";

/**
 * Profil de session = `profiles` (public) fusionné avec `profile_restricted`
 * (rôle, suspension, abonnement — jamais lisible par un autre membre, cf.
 * migration lock_down_restricted_profile_fields). Ne représente QUE le
 * profil du membre connecté : RLS n'autorise cette jointure que sur sa
 * propre ligne (`profile_restricted_select_own`).
 */
export type SessionProfile = ProfileRow & ProfileRestrictedRow;

/**
 * Data Access Layer (cf. doc Next.js authentication#creating-a-data-access-layer-dal).
 * `cache()` évite de refaire la requête plusieurs fois dans le même rendu
 * serveur si plusieurs composants appellent cette fonction.
 */
export const getCurrentSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const [{ data: profile }, { data: restricted }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profile_restricted").select("*").eq("id", user.id).single()
  ]);

  if (!profile || !restricted) {
    return { user, profile: null };
  }

  return { user, profile: { ...(profile as ProfileRow), ...(restricted as ProfileRestrictedRow) } as SessionProfile };
});

/** À utiliser dans les layouts/pages qui exigent une session active. */
export async function requireSession() {
  const { user, profile } = await getCurrentSession();
  if (!user || !profile) {
    redirect("/login");
  }
  if (profile.is_suspended) {
    redirect("/suspended");
  }
  // Paywall pré-onboarding (nouvelles inscriptions uniquement, cf. migration
  // new_signup_payment_required) : !onboarding_completed est le garde-fou
  // définitif — un compte déjà payé et onboardé un jour ne repasse plus
  // jamais par cette porte, même des années plus tard s'il devient EXPIRED
  // (cette expiration-là relève uniquement de la restriction EXPIRED,
  // ailleurs, jamais confondue avec ce paywall d'entrée). role === "USER"
  // exempte tout le staff.
  if (profile.role === "USER" && profile.payment_required && !profile.onboarding_completed && profile.subscription_status !== "ACTIVE") {
    redirect("/payment-required");
  }
  return { user, profile: profile! };
}

/** À utiliser dans les layouts/pages réservées aux modérateurs/administrateurs. */
export async function requireStaffSession() {
  const { user, profile } = await requireSession();
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN" && profile.role !== "MODERATOR") {
    redirect("/");
  }
  return { user, profile };
}

/** Gestion (utilisateurs, publications officielles, campagnes email, transactions) — ADMIN et au-dessus, pas MODERATOR. */
export async function requireAdminSession() {
  const { user, profile } = await requireSession();
  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return { user, profile };
}

/** Espace de pilotage complet — réservé au(x) compte(s) SUPER_ADMIN uniquement. */
export async function requireSuperAdminSession() {
  const { user, profile } = await requireSession();
  if (profile.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return { user, profile };
}
