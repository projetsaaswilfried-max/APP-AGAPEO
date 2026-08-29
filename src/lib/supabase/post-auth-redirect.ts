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
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", userId).maybeSingle();
  return profile && !profile.onboarding_completed ? "/onboarding" : next;
}
