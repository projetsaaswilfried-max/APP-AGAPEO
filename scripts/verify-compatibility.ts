/**
 * Vérifie le moteur de compatibilité (src/domain/matching/compatibility.ts)
 * en conditions réelles : récupère les vraies lignes Supabase (viewer +
 * profils de test) et exécute la même fonction pure que l'application,
 * sans rien mocker.
 *
 * Usage : npx tsx scripts/verify-compatibility.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeCompatibility } from "../src/domain/matching/compatibility";
import type { ProfileRow } from "../src/lib/supabase/database.types";

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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: viewerRow, error: viewerErr } = await admin.from("profiles").select("*").eq("is_test_account", false).single();
  if (viewerErr || !viewerRow) throw viewerErr ?? new Error("Aucun compte réel trouvé");
  const viewer = viewerRow as ProfileRow;

  const targetGender = viewer.gender === "MALE" ? "FEMALE" : "MALE";
  const { data: candidates, error: candErr } = await admin
    .from("profiles")
    .select("*")
    .eq("is_test_account", true)
    .eq("gender", targetGender)
    .not("avatar_url", "is", null)
    .not("church_denomination", "is", null)
    .not("why_marriage", "is", null);
  if (candErr) throw candErr;

  console.log(`Viewer : ${viewer.first_name} (${viewer.gender}, ${viewer.country}) — profil complet: ${Boolean(viewer.avatar_url && viewer.church_denomination && viewer.why_marriage)}\n`);
  console.log(`${candidates?.length ?? 0} candidat(e)s éligibles trouvé(e)s pour Découvrir (mêmes filtres que discover.service.ts) :\n`);

  const results = (candidates ?? [])
    .map((row) => {
      const candidate = row as ProfileRow;
      const { score, reasons } = computeCompatibility(viewer, candidate);
      return { name: candidate.first_name, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  for (const r of results) {
    console.log(`  ${r.score}% — ${r.name}`);
    r.reasons.forEach((reason) => console.log(`      • ${reason}`));
  }

  console.log("\nCe classement est celui qui s'affichera réellement dans Découvrir (tri décroissant par score).");
  console.log("Les scores sont bas car le profil du viewer est encore incomplet (foi/valeurs/passions non renseignées) —");
  console.log("dès qu'il complètera ces sections, les dimensions correspondantes s'activeront automatiquement.");
}

main().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
