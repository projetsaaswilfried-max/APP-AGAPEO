import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 * `setAll` peut échouer si appelé depuis un Server Component pur (lecture
 * seule) — c'est normal et sans conséquence tant que `proxy.ts` rafraîchit la
 * session sur chaque requête (cf. src/proxy.ts et src/lib/supabase/proxy-session.ts).
 *
 * Non paramétré par `Database` — voir la note dans `client.ts` (bug d'inférence
 * générique de cette version de @supabase/supabase-js). Les appelants castent
 * explicitement vers les types de `database.types.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Appelé depuis un Server Component : ignoré, le proxy s'en charge.
        }
      }
    }
  });
}
