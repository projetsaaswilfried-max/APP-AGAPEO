// Cron quotidien : rafraîchit les taux de change (base XOF) utilisés pour
// convertir le prix FCFA de référence des plans Premium vers la devise
// locale du pays Mobile Money choisi (cf. fx_rates, src/lib/fx-rates.ts,
// appelé depuis initiateMobileMoneyPaymentAction). Source : open.er-api.com
// (gratuite, sans clé, couverture confirmée en direct le 2026-09-05 pour
// toutes les devises SasPay non-CFA) — mise à jour ~1x/jour côté fournisseur,
// inutile d'appeler plus souvent. XOF et XAF sont fixées à 1 (parité Franc
// CFA, ne bougent jamais) plutôt que lues depuis l'API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const FX_API_URL = "https://open.er-api.com/v6/latest/XOF";

// Devises SasPay non-CFA (cf. src/config/saspay-networks.ts) — XOF/XAF gérées à part, toujours à parité 1:1.
const NON_CFA_CURRENCIES = ["GNF", "CDF", "GHS", "NGN", "KES", "RWF", "UGX", "TZS", "ZMW", "MWK", "MZN"];

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let rates: Record<string, number>;
  try {
    const res = await fetch(FX_API_URL);
    if (!res.ok) throw new Error(`Réponse ${res.status}`);
    const json = await res.json();
    if (json.result !== "success" || !json.rates) throw new Error("Réponse inattendue (pas de champ rates).");
    rates = json.rates;
  } catch (err) {
    return new Response(JSON.stringify({ error: `Lecture des taux échouée : ${err instanceof Error ? err.message : String(err)}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  const now = new Date().toISOString();
  const rows: { currency_code: string; xof_rate: number; updated_at: string }[] = [
    { currency_code: "XOF", xof_rate: 1, updated_at: now },
    { currency_code: "XAF", xof_rate: 1, updated_at: now }
  ];
  const missing: string[] = [];
  for (const code of NON_CFA_CURRENCIES) {
    const rate = rates[code];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      missing.push(code);
      continue;
    }
    rows.push({ currency_code: code, xof_rate: rate, updated_at: now });
  }

  const { error } = await admin.from("fx_rates").upsert(rows, { onConflict: "currency_code" });
  if (error) {
    return new Response(JSON.stringify({ error: `Écriture fx_rates échouée : ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ updated: rows.length, missing }), {
    headers: { "Content-Type": "application/json" }
  });
});
