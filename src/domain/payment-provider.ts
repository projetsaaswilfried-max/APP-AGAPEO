/**
 * Agrégateur de paiement — module isomorphe (aucun import serveur), utilisable
 * côté client (page admin, choix du moyen de paiement) et serveur (résolution
 * du checkout, cf. startPremiumCheckoutAction). La valeur réelle vit en base
 * (`payment_settings`, ligne unique), cf. src/lib/actions/payment-settings.actions.ts.
 *
 * Le paiement par carte passe TOUJOURS par Chariow, sans réglage possible —
 * SasPay ne propose pas encore la carte (confirmé par le fondateur le
 * 2026-09-05). Ce réglage ne détermine donc que le processeur du Mobile
 * Money (Moov, Wave, MTN, Celtiis...) ; Chariow y reste disponible comme
 * repli en cas d'incident côté SasPay.
 */
export type PaymentProvider = "chariow" | "saspay";

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  chariow: "Chariow",
  saspay: "SasPay"
};

export const PAYMENT_PROVIDER_DESCRIPTIONS: Record<PaymentProvider, string> = {
  chariow: "Mobile Money via Chariow — à utiliser en repli si SasPay a un incident.",
  saspay: "Mobile Money via SasPay (Moov, Wave, MTN, Celtiis...) — processeur recommandé, spécialisé Afrique de l'Ouest/Centre."
};
