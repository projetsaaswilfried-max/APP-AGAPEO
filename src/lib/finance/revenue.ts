import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const CFA_CURRENCIES = new Set(["XOF", "XAF"]);
// Parité fixe du Franc CFA à l'Euro (accords de coopération monétaire,
// jamais flottante) — pas besoin d'un taux mis en cache pour cette devise
// précise, contrairement aux autres (cf. src/lib/fx-rates.ts).
const EUR_TO_XOF_PEG = 655.957;

/**
 * Construit un convertisseur "devise réelle -> centimes XOF" à partir d'une
 * seule lecture de `fx_rates` (mêmes taux mis en cache que le checkout réel,
 * src/lib/fx-rates.ts, mais utilisés ici dans le sens inverse : on repart de
 * la devise réellement encaissée — Chariow en USD, SasPay dans la devise du
 * pays du client — pour la ramener vers le FCFA de référence du tableau de
 * bord Finances). Une seule requête pour toutes les devises rencontrées,
 * plutôt qu'un aller-retour par transaction.
 */
export async function buildXofConverter(admin: SupabaseClient, currencies: string[]) {
  const currenciesNeedingRate = [...new Set(currencies.filter((c) => !CFA_CURRENCIES.has(c) && c !== "EUR"))];

  const rateByCurrency = new Map<string, number>();
  if (currenciesNeedingRate.length > 0) {
    const { data } = await admin.from("fx_rates").select("currency_code, xof_rate").in("currency_code", currenciesNeedingRate);
    for (const row of (data as { currency_code: string; xof_rate: number }[] | null) ?? []) {
      rateByCurrency.set(row.currency_code, Number(row.xof_rate));
    }
  }

  /** Retourne `null` si le taux est indisponible — jamais une valeur approximative. */
  return function toXofCents(amountCents: number, currency: string): number | null {
    if (CFA_CURRENCIES.has(currency)) return amountCents;
    if (currency === "EUR") return Math.round(amountCents * EUR_TO_XOF_PEG);
    const rate = rateByCurrency.get(currency);
    if (!rate) return null;
    // xof_rate = unités de `currency` pour 1 XOF (cf. convertFcfaToLocalAmount
    // dans src/lib/fx-rates.ts, qui multiplie par ce taux pour repartir DU
    // XOF) — ici on fait le chemin inverse, donc on divise.
    return Math.round(amountCents / rate);
  };
}
