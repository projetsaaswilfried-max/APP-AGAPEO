/**
 * Source unique pour les deux plans Premium (prix, durée, libellé, valeur
 * stockée dans `profile_restricted.subscription_plan`/`transactions.plan`).
 * Module isomorphe (aucun import serveur) — utilisable côté client (page
 * Premium, tableau admin) et côté serveur (webhook Chariow, actions admin,
 * emails).
 */
export type PremiumPlanKey = "MONTHLY" | "QUARTERLY";

export interface PremiumPlanConfig {
  /** Valeur stockée en base (`subscription_plan`, `transactions.plan`). */
  dbValue: string;
  label: string;
  periodDays: number;
  /**
   * Montant réellement facturé via Chariow, qui traite en USD — sert
   * uniquement à vérifier le montant reçu par le webhook et au suivi Meta
   * Pixel (valeur d'achat réelle). Jamais affiché aux membres : voir
   * `priceFcfaLabel` pour tout affichage (landing, page Premium, emails).
   */
  priceUsd: number;
  /** Prix affiché aux membres — déjà formaté (espace comme séparateur de milliers). */
  priceFcfaLabel: string;
}

export const PREMIUM_PLANS: Record<PremiumPlanKey, PremiumPlanConfig> = {
  MONTHLY: { dbValue: "premium_monthly", label: "Mensuel", periodDays: 30, priceUsd: 12, priceFcfaLabel: "6 999 FCFA" },
  QUARTERLY: { dbValue: "premium_quarterly", label: "Trimestriel", periodDays: 90, priceUsd: 30, priceFcfaLabel: "17 497 FCFA" }
};

export function planKeyFromDbValue(dbValue: string | null | undefined): PremiumPlanKey | null {
  if (dbValue === "premium_monthly") return "MONTHLY";
  if (dbValue === "premium_quarterly") return "QUARTERLY";
  return null;
}
