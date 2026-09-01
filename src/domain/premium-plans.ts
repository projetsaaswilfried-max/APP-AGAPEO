/**
 * Source unique pour les deux plans Premium (prix, durée, libellé, valeur
 * stockée dans `profile_restricted.subscription_plan`/`transactions.plan`).
 * Module isomorphe (aucun import serveur) — utilisable côté client (page
 * Premium, tableau admin) et côté serveur (webhook Chariow, actions admin,
 * emails).
 */
export type PremiumPlanKey = "MONTHLY" | "QUARTERLY" | "ACCESS";

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
  QUARTERLY: { dbValue: "premium_quarterly", label: "Trimestriel", periodDays: 90, priceUsd: 30, priceFcfaLabel: "17 497 FCFA" },
  // MONTHLY/QUARTERLY restent définis (ne jamais les supprimer) pour que les
  // abonnés déjà actifs sur l'un de ces deux plans continuent de s'afficher
  // correctement sur "Mon Plan" — seul ACCESS est proposé à l'achat désormais.
  // Chariow facture en USD ; le webhook compare via Math.round(montant reçu)
  // === priceUsd (cf. chariow-webhook-handler.ts) — priceUsd DOIT donc être
  // un nombre ENTIER (jamais de centimes), sinon aucun paiement réel ne
  // pourra jamais correspondre et l'accès ne sera jamais débloqué même en
  // cas de paiement réussi. Prix rigoureux fixé par le fondateur : 2 329 FCFA
  // (taux implicite des deux autres plans ~583 FCFA/$, donc 2 329 FCFA = 4$
  // pile) — LE PRODUIT CHARIOW DOIT ÊTRE CONFIGURÉ À EXACTEMENT 4 USD, sans
  // quoi les paiements réels seront enregistrés mais l'accès ne sera jamais
  // débloqué, silencieusement.
  ACCESS: { dbValue: "premium_access", label: "Accès complet", periodDays: 30, priceUsd: 4, priceFcfaLabel: "2 329 FCFA" }
};

export function planKeyFromDbValue(dbValue: string | null | undefined): PremiumPlanKey | null {
  if (dbValue === "premium_monthly") return "MONTHLY";
  if (dbValue === "premium_quarterly") return "QUARTERLY";
  if (dbValue === "premium_access") return "ACCESS";
  return null;
}
