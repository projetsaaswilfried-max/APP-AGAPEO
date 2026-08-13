/** Levée par les services quand une action est bloquée par la RLS faute d'abonnement Premium actif. */
export class PremiumRequiredError extends Error {
  constructor(message = "Cette action nécessite un abonnement Premium.") {
    super(message);
    this.name = "PremiumRequiredError";
  }
}

/** Détecte une violation RLS Postgres (42501) — code utilisé par les gates Premium au niveau base de données. */
export function isRlsViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42501");
}
