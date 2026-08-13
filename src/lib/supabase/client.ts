"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

/**
 * Client Supabase pour les Client Components. Une seule instance par onglet
 * (createBrowserClient() la met déjà en cache en interne), ré-exportée ici
 * pour éviter d'importer @supabase/ssr partout dans le code applicatif.
 *
 * NOTE TYPAGE : le client n'est volontairement PAS paramétré par `Database`.
 * La version de @supabase/supabase-js installée ici (2.112.x) a une chaîne
 * de génériques par défaut (`SupabaseClient<Database, SchemaNameOrClientOptions,
 * SchemaName, Schema, ...>`) qui échoue à résoudre `Schema` même pour un type
 * `Database` minimal et structurellement correct — chaque `.from(...)` retombe
 * sur `never`. Plutôt que de dépendre de cette inférence fragile, les services
 * castent explicitement les résultats vers les types de `database.types.ts`
 * (ex: `row as ProfileRow`), ce qui donne le même niveau de sécurité de type
 * à l'usage sans être bloqué par ce problème d'inférence en amont.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
