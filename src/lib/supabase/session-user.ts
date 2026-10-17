import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Utilisateur de la session déjà présente dans le navigateur — lecture
 * locale, sans aller-retour réseau vers Supabase Auth (contrairement à
 * `auth.getUser()`, qui ajoutait une requête avant CHAQUE chargement de
 * données côté client). Côté navigateur, l'identifiant ne sert qu'à
 * construire les requêtes : la sécurité des données reste garantie par les
 * règles RLS de la base, et le jeton est revalidé par le proxy à chaque
 * navigation. Ne jamais utiliser côté serveur (cf. lib/supabase/session.ts).
 */
export async function getSessionUser(supabase: Pick<SupabaseClient, "auth">) {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  return { data: { user: session?.user ?? null } };
}
