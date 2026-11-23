/**
 * Vérifie, contre la vraie base, que les outils de l'assistant de support
 * autorisent et refusent ce qu'il faut. C'est la partie critique : l'assistant
 * décide QUAND appeler un outil, mais c'est ce code qui décide SI l'action est
 * permise, et c'est donc lui qu'il faut éprouver.
 *
 * Tout se passe sur un compte JETABLE créé puis supprimé par le script.
 * Aucun membre réel n'est touché.
 *
 * Usage (la condition react-server permet d'importer les modules `server-only`
 * hors du serveur Next) :
 *   npx tsx --conditions=react-server scripts/verify-support-agent-tools.ts
 */
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
loadEnvLocal();

const checks: { label: string; ok: boolean }[] = [];

function expect(label: string, ok: boolean, detail = "") {
  checks.push({ label, ok });
  console.log(`   ${ok ? "OK   " : "ECHEC"} ${label}${ok ? "" : "  <- " + detail}`);
}

async function main() {
  // Imports différés : les modules `server-only` ne doivent être chargés
  // qu'après la lecture de .env.local, et tsx compile ce fichier en CJS (pas
  // d'await au niveau racine).
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { executeSupportTool } = await import("../src/lib/support-agent/tools");
  const { loadMemberDossier, renderDossier } = await import("../src/lib/support-agent/context");
  const admin = createAdminClient();

  console.log("1. Compte jetable + dossier de support...");
  const email = `agent-tools-${Date.now()}@example.com`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: `Tst-${Math.random().toString(36).slice(2)}-7aB`,
    email_confirm: true,
    user_metadata: { first_name: "OutilsTest", last_name: "Jetable" }
  });
  if (createError || !created.user) throw new Error("Création : " + createError?.message);
  const userId = created.user.id;
  await new Promise((r) => setTimeout(r, 2500));

  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .insert({ user_id: userId, subject: "Test outils assistant" })
    .select("id")
    .single();
  if (ticketError || !ticket) throw new Error("Dossier : " + ticketError?.message);
  const ctx = { userId, ticketId: ticket.id };
  console.log(`   membre ${userId}, dossier ${ticket.id}`);

  try {
    console.log("\n2. Ouverture d'accès SANS aucun paiement : doit refuser");
    let r = await executeSupportTool(ctx, "ouvrir_acces_apres_verification", {});
    expect("refus faute de paiement", r.outcome === "REFUSED", r.result.slice(0, 120));

    console.log("\n3. Paiement réussi jamais crédité : doit ouvrir l'accès");
    await admin.from("transactions").insert({
      user_id: userId,
      status: "SUCCEEDED",
      plan: "premium_weekly",
      provider: "saspay",
      amount_cents: 233500,
      currency: "XOF",
      premium_granted_at: null
    });
    r = await executeSupportTool(ctx, "ouvrir_acces_apres_verification", {});
    expect("accès ouvert sur paiement réel", r.outcome === "APPLIED", r.result.slice(0, 160));

    const { data: afterGrant } = await admin
      .from("profile_restricted")
      .select("subscription_status, subscription_hold_days, subscription_current_period_end")
      .eq("id", userId)
      .maybeSingle();
    expect("abonnement passé ACTIVE", afterGrant?.subscription_status === "ACTIVE", String(afterGrant?.subscription_status));
    expect(
      "jours mis en réserve (photo non validée)",
      afterGrant?.subscription_hold_days !== null && afterGrant?.subscription_current_period_end === null,
      `reserve=${afterGrant?.subscription_hold_days} echeance=${afterGrant?.subscription_current_period_end}`
    );

    console.log("\n4. Deuxième ouverture alors que l'accès est déjà actif : doit refuser");
    r = await executeSupportTool(ctx, "ouvrir_acces_apres_verification", {});
    expect("pas de double octroi", r.outcome === "REFUSED", r.result.slice(0, 120));

    console.log("\n5. Date de naissance : bornes puis plafond");
    r = await executeSupportTool(ctx, "fix_birth_date", { birth_date: "2015-01-01" });
    expect("refus d'un mineur", r.outcome === "REFUSED", r.result.slice(0, 100));
    r = await executeSupportTool(ctx, "fix_birth_date", { birth_date: "01/01/1990" });
    expect("refus d'un format invalide", r.outcome === "REFUSED", r.result.slice(0, 100));
    r = await executeSupportTool(ctx, "fix_birth_date", { birth_date: "1990-05-14" });
    expect("date valide appliquée", r.outcome === "APPLIED", r.result.slice(0, 100));
    const { data: profileAfter } = await admin.from("profiles").select("birth_date").eq("id", userId).maybeSingle();
    expect("écriture effective en base", profileAfter?.birth_date === "1990-05-14", String(profileAfter?.birth_date));
    await executeSupportTool(ctx, "fix_birth_date", { birth_date: "1991-06-15" });
    r = await executeSupportTool(ctx, "fix_birth_date", { birth_date: "1992-07-16" });
    expect("plafond quotidien atteint au 3e essai", r.outcome === "REFUSED", r.result.slice(0, 100));

    console.log("\n6. Genre : valeur libre refusée, valeur attendue appliquée");
    r = await executeSupportTool(ctx, "fix_gender", { gender: "AUTRE" });
    expect("refus d'une valeur hors liste", r.outcome === "REFUSED", r.result.slice(0, 100));
    r = await executeSupportTool(ctx, "fix_gender", { gender: "FEMALE" });
    expect("genre appliqué", r.outcome === "APPLIED", r.result.slice(0, 100));

    console.log("\n7. Outil inconnu (si le modèle hallucine un nom)");
    r = await executeSupportTool(ctx, "offrir_un_an_gratuit", { mois: 12 });
    expect("outil inconnu rejeté sans effet", r.outcome === "ERROR", r.result.slice(0, 100));

    console.log("\n8. Escalade vers l'équipe, puis double escalade");
    r = await executeSupportTool(ctx, "transmettre_a_l_equipe", { resume: "Test automatisé des outils.", categorie: "BUG" });
    expect("escalade appliquée", r.outcome === "APPLIED", r.result.slice(0, 140));
    const { data: escalatedTicket } = await admin.from("support_tickets").select("escalated_at").eq("id", ticket.id).maybeSingle();
    expect("dossier marqué pour l'équipe", Boolean(escalatedTicket?.escalated_at), String(escalatedTicket?.escalated_at));
    r = await executeSupportTool(ctx, "transmettre_a_l_equipe", { resume: "Deuxième essai.", categorie: "AUTRE" });
    expect("pas de double escalade", r.outcome === "REFUSED", r.result.slice(0, 100));

    console.log("\n9. Journal d'audit");
    const { count } = await admin.from("support_agent_actions").select("*", { count: "exact", head: true }).eq("user_id", userId);
    expect("chaque appel est journalisé (refus compris)", (count ?? 0) >= 13, `${count} lignes`);

    console.log("\n10. Dossier rendu pour le prompt (extrait)");
    const dossier = await loadMemberDossier(userId);
    const rendered = dossier ? renderDossier(dossier) : "";
    expect("le dossier mentionne la réserve de jours", rendered.includes("EN RÉSERVE"), "absent");
    expect("le dossier mentionne le paiement", rendered.includes("SUCCEEDED"), "absent");
    console.log(
      rendered
        .split("\n")
        .map((l) => "      " + l)
        .join("\n")
    );
  } finally {
    console.log("\n11. Suppression du compte jetable...");
    const { error } = await admin.auth.admin.deleteUser(userId);
    console.log(error ? `   ECHEC de la suppression : ${error.message}` : "   compte supprimé (cascade sur dossier, journal, paiement)");
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n--- RÉSULTAT --- ${checks.length - failed.length}/${checks.length} contrôles passés`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("ERREUR :", err instanceof Error ? err.message : err);
  process.exit(1);
});
