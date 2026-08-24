function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copie .env.example vers .env.local et renseigne tes clés Supabase.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
};

/** Lazy — n'explose que si un code serveur qui en a réellement besoin l'appelle. */
export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Lazy — utilisée uniquement par les envois d'email admin (campagnes, digest). */
export function getResendApiKey(): string {
  return requireEnv("RESEND_API_KEY", process.env.RESEND_API_KEY);
}

/**
 * Adresse de réception des messages du support (notifiée par email à chaque
 * nouveau message d'un membre). Tant qu'aucun domaine n'est vérifié sur
 * Resend, seule l'adresse propriétaire du compte Resend reçoit réellement
 * les emails (cf. mémoire "resend-domain-blocker") — configurable ici sans
 * toucher au code une fois le domaine vérifié.
 */
export function getSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || "projetsaas.wilfried@gmail.com";
}

/** Clé API Chariow (processeur de paiement) — jamais exposée côté client, appels server-only. */
export function getChariowApiKey(): string {
  return requireEnv("CHARIOW_API_KEY", process.env.CHARIOW_API_KEY);
}

export type ChariowPlanKey = "MONTHLY" | "QUARTERLY";

/** ID du produit Chariow "Abonnement Premium Agapeo" (paiement unique, renouvelé manuellement chaque cycle) — un produit distinct par plan. */
export function getChariowProductId(plan: ChariowPlanKey): string {
  const varName = plan === "QUARTERLY" ? "CHARIOW_PRODUCT_ID_QUARTERLY" : "CHARIOW_PRODUCT_ID";
  return requireEnv(varName, process.env[varName]);
}

/**
 * Secrets de signature des Pulses (webhooks) Chariow — un Pulse (et donc un
 * secret) distinct par produit/plan côté Chariow. Non-bloquant si le
 * trimestriel n'est pas encore configuré (`CHARIOW_PULSE_SECRET_QUARTERLY`
 * absent) : le webhook continue de fonctionner pour le mensuel en attendant.
 */
export function getChariowPulseSecrets(): { plan: ChariowPlanKey; secret: string }[] {
  const secrets: { plan: ChariowPlanKey; secret: string }[] = [];
  if (process.env.CHARIOW_PULSE_SECRET) secrets.push({ plan: "MONTHLY", secret: process.env.CHARIOW_PULSE_SECRET });
  if (process.env.CHARIOW_PULSE_SECRET_QUARTERLY) secrets.push({ plan: "QUARTERLY", secret: process.env.CHARIOW_PULSE_SECRET_QUARTERLY });
  return secrets;
}
