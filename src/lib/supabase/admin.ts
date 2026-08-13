import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
