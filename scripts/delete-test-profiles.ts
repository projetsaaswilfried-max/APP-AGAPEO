/**
 * Supprime définitivement tous les comptes marqués is_test_account = true
 * (auth.users + toutes les données liées, via ON DELETE CASCADE) — à lancer
 * une fois avant le lancement réel de la plateforme.
 *
 * Usage : npx tsx scripts/delete-test-profiles.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: testProfiles, error } = await admin.from("profiles").select("id, first_name, last_name").eq("is_test_account", true);
  if (error) throw error;

  if (!testProfiles || testProfiles.length === 0) {
    console.log("Aucun profil de test à supprimer.");
    return;
  }

  console.log(`${testProfiles.length} profil(s) de test trouvé(s) :`);
  testProfiles.forEach((p) => console.log(`  - ${p.first_name} ${p.last_name} (${p.id})`));

  for (const p of testProfiles) {
    const { error: delErr } = await admin.auth.admin.deleteUser(p.id);
    if (delErr) console.error(`  ÉCHEC suppression ${p.first_name}:`, delErr.message);
    else console.log(`  supprimé : ${p.first_name} ${p.last_name}`);
  }

  console.log("\nTerminé. Tous les comptes de test ont été supprimés (profils, photos, messages, conversations en cascade).");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
