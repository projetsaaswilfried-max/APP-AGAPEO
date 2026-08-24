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
  priceUsd: number;
}

export const PREMIUM_PLANS: Record<PremiumPlanKey, PremiumPlanConfig> = {
  MONTHLY: { dbValue: "premium_monthly", label: "Mensuel", periodDays: 30, priceUsd: 12 },
  QUARTERLY: { dbValue: "premium_quarterly", label: "Trimestriel", periodDays: 90, priceUsd: 30 }
};

export function planKeyFromDbValue(dbValue: string | null | undefined): PremiumPlanKey | null {
  if (dbValue === "premium_monthly") return "MONTHLY";
  if (dbValue === "premium_quarterly") return "QUARTERLY";
  return null;
}
