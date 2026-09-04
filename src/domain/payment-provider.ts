/**
 * Agrégateur de paiement actuellement actif — module isomorphe (aucun import
 * serveur), utilisable côté client (page admin) et serveur (résolution du
 * checkout). La valeur réelle vit en base (`payment_settings`, ligne unique),
 * cf. src/domain/services/payment-settings.service.ts pour la lecture/écriture.
 */
export type PaymentProvider = "chariow" | "saspay";

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  chariow: "Chariow",
  saspay: "SasPay"
};

export const PAYMENT_PROVIDER_DESCRIPTIONS: Record<PaymentProvider, string> = {
  chariow: "Encaisse en dollars (USD) — paiement par carte et mobile money via Chariow.",
  saspay: "Encaisse en francs CFA (XOF) — paiement mobile money et carte, spécialisé Afrique de l'Ouest/Centre."
};
