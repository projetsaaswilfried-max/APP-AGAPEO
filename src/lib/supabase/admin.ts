import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { env, getSupabaseServiceRoleKey } from "@/config/env";

/**
 * Client "service_role" — contourne intégralement RLS.
 * Ne JAMAIS importer ce fichier depuis un Client Component ni renvoyer ce
 * client (ou son résultat brut) au navigateur. Réservé aux Server Actions
 * qui effectuent des opérations d'administration explicites (ex : suppression
 * de compte via l'API Admin Auth, publication officielle validée par un rôle).
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl, getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * `listUsers` plafonne à 1000 comptes par page — au-delà, un simple
 * `listUsers({ page: 1, perPage: 1000 })` renvoie silencieusement seulement
 * les 1000 comptes les plus récents, laissant tous les autres (comptes email
 * ET Google confondus) sans email résolu partout où ce résultat sert à
 * associer un email à un profil (ex: admin/users, composeur de campagnes).
 * Bug réel trouvé le 2026-09-03 : 670 comptes sur 1670 en étaient déjà
 * exclus. Toujours utiliser cette fonction plutôt qu'un appel direct dès
 * qu'on a besoin de la liste complète des comptes.
 */
export async function listAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return all;
}

/**
 * PostgREST plafonne lui aussi toute requête à 1000 lignes par défaut, même
 * sans .limit() explicite — même piège que listAllAuthUsers ci-dessus, mais
 * côté table Postgres cette fois (ex: `profiles`, désormais >1000 lignes).
 * Bug réel trouvé le 2026-09-03 : les 670 comptes les plus anciens (dont le
 * tout premier utilisateur du produit) étaient silencieusement absents des
 * pages admin ET des envois de campagne email qui lisaient `profiles` sans
 * pagination. Passer un query-builder qui applique `.range(from, to)` à la
 * requête (ex: `(from, to) => admin.from("profiles").select("*").range(from, to)`).
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}
