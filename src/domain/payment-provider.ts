/**
 * Agrégateur de paiement — module isomorphe (aucun import serveur), utilisable
 * côté client (page admin, choix du moyen de paiement) et serveur (résolution
 * du checkout, cf. startPremiumCheckoutAction). La valeur réelle vit en base
 * (`payment_settings`, ligne unique), cf. src/lib/actions/payment-settings.actions.ts.
 *
 * Détermine l'agrégateur pour TOUS les paiements — carte comme Mobile Money —
 * depuis que SasPay encaisse aussi par carte (réseau `card`, ajouté à leur
 * catalogue le 2026-09-06, confirmé par le fondateur ; auparavant réservé au
 * Mobile Money, la carte passait alors toujours par Chariow). Le Mobile Money
 * SasPay reste un paiement direct (push, sans redirection, cf.
 * mobile-money.actions.ts) ; la carte, chez les deux agrégateurs, nécessite
 * toujours une redirection vers leur page hébergée (cf.
 * startPremiumCheckoutAction/startSasPayCardCheckout).
 */
export type PaymentProvider = "chariow" | "saspay";

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  chariow: "Chariow",
  saspay: "SasPay"
};

export const PAYMENT_PROVIDER_DESCRIPTIONS: Record<PaymentProvider, string> = {
  chariow: "Carte bancaire et Mobile Money via Chariow — à utiliser en repli si SasPay a un incident.",
  saspay: "Carte bancaire et Mobile Money (Moov, Wave, MTN, Celtiis...) via SasPay — processeur recommandé, spécialisé Afrique de l'Ouest/Centre."
};
