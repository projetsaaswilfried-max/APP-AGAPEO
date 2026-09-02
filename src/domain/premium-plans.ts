/**
 * Source unique pour tous les plans Premium (prix, durée, libellé, valeur
 * stockée dans `profile_restricted.subscription_plan`/`transactions.plan`).
 * Module isomorphe (aucun import serveur) — utilisable côté client (page
 * Premium, landing page, tableau admin) et côté serveur (webhook Chariow,
 * actions admin, emails).
 */
export type PremiumPlanKey = "WEEKLY" | "HALF_MONTH" | "MONTHLY" | "QUARTERLY" | "ACCESS";

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
  /**
   * Faux pour un plan retiré de la vente (gardé uniquement pour que les
   * abonnés déjà actifs continuent de s'afficher correctement sur "Mon
   * Plan") — jamais proposé à l'achat sur la landing page ni "Mon Plan",
   * jamais résolu par défaut dans premium.actions.ts.
   */
  purchasable: boolean;
}

export const PREMIUM_PLANS: Record<PremiumPlanKey, PremiumPlanConfig> = {
  // Chariow facture en USD ; le webhook compare via Math.round(montant reçu)
  // === priceUsd (cf. chariow-webhook-handler.ts) — priceUsd DOIT donc être
  // un nombre ENTIER (jamais de centimes) pour chaque plan, sinon aucun
  // paiement réel ne pourra jamais correspondre et l'accès ne sera jamais
  // débloqué même en cas de paiement réussi. Taux implicite ~583 FCFA/$
  // (dérivé de MONTHLY/QUARTERLY, en place depuis le tout début) — les FCFA
  // des deux nouveaux plans (WEEKLY, HALF_MONTH) sont une estimation à ce
  // même taux, à confirmer avec le fondateur une fois leurs produits Chariow
  // créés et leur prix réel configuré.
  WEEKLY: { dbValue: "premium_weekly", label: "1 semaine", periodDays: 7, priceUsd: 4, priceFcfaLabel: "2 333 FCFA", purchasable: true },
  HALF_MONTH: { dbValue: "premium_half_month", label: "Mi-mois (15 jours)", periodDays: 15, priceUsd: 7, priceFcfaLabel: "4 083 FCFA", purchasable: true },
  MONTHLY: { dbValue: "premium_monthly", label: "Mensuel", periodDays: 30, priceUsd: 12, priceFcfaLabel: "6 999 FCFA", purchasable: true },
  QUARTERLY: { dbValue: "premium_quarterly", label: "Trimestriel", periodDays: 90, priceUsd: 30, priceFcfaLabel: "17 497 FCFA", purchasable: true },
  // Retiré de la vente le 2026-09-02 (retour à une offre multi-durées) — reste
  // défini pour les abonnés déjà actifs sur ce plan. Ne jamais supprimer.
  ACCESS: { dbValue: "premium_access", label: "Accès complet", periodDays: 30, priceUsd: 7, priceFcfaLabel: "4 083 FCFA", purchasable: false }
};

/** Plans proposés à l'achat aujourd'hui, dans l'ordre d'affichage (le plus court au plus long). */
export const PURCHASABLE_PLAN_KEYS: PremiumPlanKey[] = (Object.keys(PREMIUM_PLANS) as PremiumPlanKey[]).filter(
  (key) => PREMIUM_PLANS[key].purchasable
);

export function planKeyFromDbValue(dbValue: string | null | undefined): PremiumPlanKey | null {
  if (dbValue === "premium_weekly") return "WEEKLY";
  if (dbValue === "premium_half_month") return "HALF_MONTH";
  if (dbValue === "premium_monthly") return "MONTHLY";
  if (dbValue === "premium_quarterly") return "QUARTERLY";
  if (dbValue === "premium_access") return "ACCESS";
  return null;
}
