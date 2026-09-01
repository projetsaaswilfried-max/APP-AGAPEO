import type { createClient } from "@/lib/supabase/server";

/**
 * Décide où atterrir juste après l'établissement d'une session (lien email
 * ou OAuth) : "/feed" est la destination générique — jamais un choix
 * explicite de l'appelant (ex: `/reset-password`, préservé tel quel) — un
 * compte qui n'a pas encore terminé son profil est alors envoyé directement
 * vers `/onboarding` plutôt que sur le fil d'actualité, pour ne pas compter
 * uniquement sur le bandeau de rappel pour l'y amener de lui-même.
 */
export async function resolvePostAuthRedirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  next: string
): Promise<string> {
  if (next !== "/feed") return next;

  const [{ data: profile }, { data: restricted }] = await Promise.all([
    supabase.from("profiles").select("onboarding_completed, payment_required").eq("id", userId).maybeSingle(),
    supabase.from("profile_restricted").select("subscription_status").eq("id", userId).maybeSingle()
  ]);
  if (!profile) return next;

  // Nouvelle inscription pas encore payée (cf. migration new_signup_payment_required)
  // — passe devant le garde onboarding_completed ci-dessous, avant même la
  // confirmation email ou le premier callback Google OAuth.
  if (profile.payment_required && restricted?.subscription_status !== "ACTIVE") return "/payment-required";
  return !profile.onboarding_completed ? "/onboarding" : next;
}
