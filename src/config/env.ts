import { PREMIUM_PLANS } from "@/domain/premium-plans";

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

/** ID du produit Chariow "Abonnement Premium Agapeo" (paiement unique, renouvelé manuellement chaque cycle) — un produit distinct par plan. */
export function getChariowProductId(plan: ChariowPlanKey): string {
  const varName = CHARIOW_PRODUCT_ID_VAR[plan];
  return requireEnv(varName, process.env[varName]);
}

/**
 * Retrouve le plan à partir de l'ID produit reçu dans le webhook Chariow —
 * un seul Pulse (webhook) couvre désormais tous les produits, donc le plan
 * n'est plus déterminé par l'URL appelée mais par ce champ du paiement.
 * Restreint aux plans `purchasable` : ACCESS a été retiré de la vente et son
 * ancien produit Chariow a été réattribué à HALF_MONTH (même ID physique),
 * donc même si une variable d'environnement orpheline CHARIOW_PRODUCT_ID_ACCESS
 * traîne encore quelque part avec cette même valeur, elle ne doit jamais
 * l'emporter sur le plan réellement en vente pour ce produit.
 */
export function planKeyFromChariowProductId(productId: string): ChariowPlanKey | null {
  const entry = Object.entries(CHARIOW_PRODUCT_ID_VAR).find(
    ([key, varName]) => PREMIUM_PLANS[key as ChariowPlanKey].purchasable && process.env[varName] === productId
  );
  return (entry?.[0] as ChariowPlanKey | undefined) ?? null;
}

/** Secret de signature du Pulse (webhook) Chariow — un seul Pulse partagé par tous les plans. */
export function getChariowSharedPulseSecret(): string {
  return requireEnv("CHARIOW_PULSE_SECRET", process.env.CHARIOW_PULSE_SECRET);
}
