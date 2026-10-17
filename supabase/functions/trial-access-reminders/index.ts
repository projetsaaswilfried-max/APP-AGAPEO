// Cron toutes les 15 minutes : l'essai Premium gratuit de 24h a été annulé
// (plus aucune nouvelle attribution, cf. approveVerificationRequestAction) —
// cette fonction ne fait plus qu'éteindre en douceur les essais déjà en cours
// au moment de l'annulation, en les repassant en FREE (jamais EXPIRED,
// réservé à un vrai abonnement payant non renouvelé) une fois leurs 24h
// écoulées. `trial_granted_at` n'est jamais remis à null ici : c'est le
// marqueur permanent "essai déjà consommé", cf. migration trial_access_columns.
// Une fois plus aucune ligne à traiter, ce cron peut être supprimé.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const nowIso = new Date().toISOString();

  const { data: ended, error: endedErr } = await admin
    .from("profile_restricted")
    .update({
      subscription_status: "FREE",
      subscription_plan: null,
      subscription_current_period_end: null
    })
    .eq("subscription_plan", "FREE_TRIAL")
    .lt("subscription_current_period_end", nowIso)
    .select("id");

  if (endedErr) {
    return new Response(JSON.stringify({ error: endedErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ endedCount: (ended ?? []).length }), { headers: { "Content-Type": "application/json" } });
});
