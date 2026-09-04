import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const CFA_CURRENCIES = new Set(["XOF", "XAF"]);
// Cron quotidien (refresh-fx-rates) — 4 jours de marge avant de bloquer un
// paiement plutôt que de risquer de facturer sur un taux périmé.
const MAX_RATE_AGE_MS = 4 * 24 * 60 * 60 * 1000;

/**
 * Convertit le prix FCFA de référence d'un plan Premium vers la devise
 * locale d'un pays Mobile Money SasPay (cf. src/config/saspay-networks.ts) —
 * SasPay facture dans la devise du pays choisi, jamais systématiquement en
 * FCFA. XOF et XAF sont à parité stricte 1:1 (Franc CFA) et retournés tels
 * quels. Pour toute autre devise, lit le taux mis en cache par le cron
 * refresh-fx-rates plutôt que d'appeler un service externe dans le chemin
 * critique d'un paiement réel. Lève une erreur (jamais une valeur
 * approximative) si le taux est absent ou périmé — mieux vaut bloquer un
 * paiement que facturer le mauvais montant.
 */
export async function convertFcfaToLocalAmount(priceFcfa: number, currencyCode: string): Promise<number> {
  if (CFA_CURRENCIES.has(currencyCode)) return priceFcfa;

  const admin = createAdminClient();
  const { data } = await admin.from("fx_rates").select("xof_rate, updated_at").eq("currency_code", currencyCode).maybeSingle();
  if (!data) {
    throw new Error(`Taux de change indisponible pour ${currencyCode} pour le moment. Réessaie plus tard ou choisis un autre pays.`);
  }
  if (Date.now() - new Date(data.updated_at).getTime() > MAX_RATE_AGE_MS) {
    throw new Error(`Taux de change pour ${currencyCode} périmé pour le moment. Réessaie plus tard ou choisis un autre pays.`);
  }
  return Math.round(priceFcfa * Number(data.xof_rate));
}
