import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const CFA_CURRENCIES = new Set(["XOF", "XAF"]);
// Parité fixe du Franc CFA à l'Euro (accords de coopération monétaire,
// jamais flottante) — pas besoin d'un taux mis en cache pour cette devise
// précise, contrairement aux autres (cf. src/lib/fx-rates.ts).
const EUR_TO_XOF_PEG = 655.957;

/**
 * Construit un convertisseur "devise réellement encaissée -> centimes USD"
 * pour le tableau de bord Finances (/admin/finances) — reporting
 * comptable interne en USD, indépendant de la devise réellement facturée aux
 * membres (Chariow en USD, SasPay dans la devise du pays du client). `fx_rates`
 * n'a que le XOF pour base commune (cf. src/lib/fx-rates.ts, alimenté par le
 * cron refresh-fx-rates) : toute conversion passe donc par le XOF comme
 * pivot, y compris pour USD lui-même (son propre taux XOF sert de pont pour
 * les AUTRES devises — cf. `usdPerXof` ci-dessous).
 */
export async function buildUsdConverter(admin: SupabaseClient, currencies: string[]) {
  const nonUsdCurrencies = [...new Set(currencies.filter((c) => c !== "USD"))];
  const currenciesNeedingRate = [...new Set([...nonUsdCurrencies.filter((c) => !CFA_CURRENCIES.has(c) && c !== "EUR"), "USD"])];

  const rateByCurrency = new Map<string, number>();
  if (currenciesNeedingRate.length > 0) {
    const { data } = await admin.from("fx_rates").select("currency_code, xof_rate").in("currency_code", currenciesNeedingRate);
    for (const row of (data as { currency_code: string; xof_rate: number }[] | null) ?? []) {
      rateByCurrency.set(row.currency_code, Number(row.xof_rate));
    }
  }

  // Unités d'USD pour 1 XOF — le pont utilisé pour ramener toute autre
  // devise (déjà convertie en XOF) vers l'USD.
  const usdPerXof = rateByCurrency.get("USD") ?? null;

  /** Retourne `null` si un taux nécessaire est indisponible — jamais une valeur approximative. */
  return function toUsdCents(amountCents: number, currency: string): number | null {
    if (currency === "USD") return amountCents;
    if (usdPerXof === null) return null;

    let xofCents: number;
    if (CFA_CURRENCIES.has(currency)) {
      xofCents = amountCents;
    } else if (currency === "EUR") {
      xofCents = Math.round(amountCents * EUR_TO_XOF_PEG);
    } else {
      const rate = rateByCurrency.get(currency);
      if (!rate) return null;
      // xof_rate = unités de `currency` pour 1 XOF — on repart de la devise
      // encaissée vers le XOF (pivot), donc on divise.
      xofCents = Math.round(amountCents / rate);
    }
    return Math.round(xofCents * usdPerXof);
  };
}
