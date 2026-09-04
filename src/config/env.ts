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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Meta Pixel (business.facebook.com/events_manager) — absent en dev si non configuré, le composant ne s'affiche alors pas. */
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null
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

/** Clé API secrète SasPay (sk_live_... ou sk_test_...) — jamais exposée côté client, appels server-only. */
export function getSasPayApiKey(): string {
  return requireEnv("SASPAY_API_KEY", process.env.SASPAY_API_KEY);
}

/** Secret de signature du webhook SasPay (HMAC-SHA256 sur `${timestamp}.${corps brut}`) — cf. src/lib/saspay-webhook-handler.ts. */
export function getSasPayWebhookSecret(): string {
  return requireEnv("SASPAY_WEBHOOK_SECRET", process.env.SASPAY_WEBHOOK_SECRET);
}

export type ChariowPlanKey = "WEEKLY" | "HALF_MONTH" | "MONTHLY" | "QUARTERLY" | "ACCESS";

// MONTHLY garde les noms de variables historiques (sans suffixe) pour ne pas
// casser la configuration déjà en place en production.
const CHARIOW_PRODUCT_ID_VAR: Record<ChariowPlanKey, string> = {
  MONTHLY: "CHARIOW_PRODUCT_ID",
  QUARTERLY: "CHARIOW_PRODUCT_ID_QUARTERLY",
  ACCESS: "CHARIOW_PRODUCT_ID_ACCESS",
  WEEKLY: "CHARIOW_PRODUCT_ID_WEEKLY",
  HALF_MONTH: "CHARIOW_PRODUCT_ID_HALF_MONTH"
};

const CHARIOW_PULSE_SECRET_VAR: Record<ChariowPlanKey, string> = {
  MONTHLY: "CHARIOW_PULSE_SECRET",
  QUARTERLY: "CHARIOW_PULSE_SECRET_QUARTERLY",
  ACCESS: "CHARIOW_PULSE_SECRET_ACCESS",
  WEEKLY: "CHARIOW_PULSE_SECRET_WEEKLY",
  HALF_MONTH: "CHARIOW_PULSE_SECRET_HALF_MONTH"
};

/** ID du produit Chariow "Abonnement Premium Agapeo" (paiement unique, renouvelé manuellement chaque cycle) — un produit distinct par plan. */
export function getChariowProductId(plan: ChariowPlanKey): string {
  const varName = CHARIOW_PRODUCT_ID_VAR[plan];
  return requireEnv(varName, process.env[varName]);
}

/**
 * Secret de signature du Pulse (webhook) Chariow pour ce plan — retour à un
 * Pulse (et donc un secret) distinct par plan : le Pulse unique partagé n'a
 * pas fonctionné côté Chariow (paiements reçus mais jamais activés), le
 * fondateur a recréé un Pulse séparé par produit comme avant.
 */
export function getChariowPulseSecret(plan: ChariowPlanKey): string {
  const varName = CHARIOW_PULSE_SECRET_VAR[plan];
  return requireEnv(varName, process.env[varName]);
}
