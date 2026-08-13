export type EmailAudience = "ALL" | "PREMIUM" | "NO_SUBSCRIPTION" | "VERIFIED" | "INCOMPLETE_PROFILE" | "DIRECT";

export const AUDIENCE_LABELS: Record<EmailAudience, string> = {
  ALL: "Tous les inscrits",
  PREMIUM: "Abonnés premium (actifs)",
  NO_SUBSCRIPTION: "Sans abonnement",
  VERIFIED: "Comptes vérifiés",
  INCOMPLETE_PROFILE: "Profils incomplets",
  DIRECT: "Destinataire précis"
};
