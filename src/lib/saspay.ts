import "server-only";
import { getSasPayApiKey } from "@/config/env";

const SASPAY_API_BASE = "https://api.saspay.me/api/v1";

export interface InitiateSasPaySoftpayInput {
  /** Dans `currency` ci-dessous — déjà converti depuis le prix FCFA de référence, cf. src/lib/fx-rates.ts. */
  amount: number;
  currency: string;
  countryCode: string;
  network: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  description: string;
  metadata: Record<string, string>;
  /** Un UUID par intention de paiement — réutilisé pour les retries d'une même tentative (jamais pour une nouvelle). */
  idempotencyKey: string;
}

export interface SasPaySoftpayResult {
  id: string;
  status: string;
  /**
   * Non vide pour certains réseaux (Wave, Orange Money, Djamo, carte...) —
   * il faut alors rediriger le client, aucune demande n'arrive sur son
   * téléphone. Toujours tester ce champ avant de considérer qu'il s'agit
   * d'un push direct (cf. doc SasPay, softpay.md).
   */
  checkoutUrl: string | null;
}

export interface SasPayPaymentStatus {
  id: string;
  status: string;
  requestedAmount: string;
  currency: string;
}

/**
 * Malgré les exemples "à plat" de leur documentation OpenAPI, l'API réelle
 * enveloppe systématiquement dans { success, data, code } côté succès
 * (vérifié en direct le 2026-09-04) — et dans { success, error, code } côté
 * échec, avec DEUX formes différentes selon le type d'erreur (toutes deux
 * vérifiées en direct le 2026-09-04) : erreurs de validation façon Django
 * REST (`{"error":{"amount":["Le montant minimum est de 200 XOF."]}}`) ET
 * erreurs métier avec un message direct (`{"error":{"message":"Réseau
 * inconnu ou inactif : '...'.", "code":"invalid_method"}}`) — jamais un
 * simple champ `message` texte au niveau racine.
 */
function extractSasPayErrorMessage(json: unknown): string | null {
  const error = (json as { error?: unknown } | null)?.error;
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.detail === "string") return obj.detail;
    for (const value of Object.values(obj)) {
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return null;
}

async function parseEnveloppe<T>(res: Response): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    return { ok: false, message: extractSasPayErrorMessage(json) || (json as { message?: string } | null)?.message || `Code ${res.status}.` };
  }
  return { ok: true, data: json.data as T };
}

/**
 * Initie un paiement Mobile Money DIRECTEMENT depuis notre propre page —
 * aucune redirection vers une page hébergée SasPay, sauf pour les réseaux qui
 * l'exigent (Wave, Orange Money, Djamo, carte) : dans ce cas `checkoutUrl`
 * est renvoyée et DOIT être utilisée (cf. commentaire sur checkoutUrl).
 * Sinon, une demande de paiement est poussée directement sur le téléphone du
 * client (USSD/notification) — on interroge ensuite `getSasPayPaymentStatus`
 * pour savoir quand il l'a confirmée.
 */
export async function initiateSasPaySoftpay(input: InitiateSasPaySoftpayInput): Promise<SasPaySoftpayResult> {
  const res = await fetch(`${SASPAY_API_BASE}/payments/softpay/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSasPayApiKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey
    },
    body: JSON.stringify({
      amount: input.amount.toFixed(2),
      currency: input.currency,
      country: input.countryCode,
      network: input.network,
      description: input.description,
      customer: { email: input.email, first_name: input.firstName, last_name: input.lastName, phone: input.phone },
      metadata: input.metadata
    })
  });

  const parsed = await parseEnveloppe<{ id: string; status: string; checkout_url: string | null }>(res);
  if (!parsed.ok) throw new Error(parsed.message);
  return { id: parsed.data.id, status: parsed.data.status, checkoutUrl: parsed.data.checkout_url || null };
}

/** Sondage du statut réel — utilisé par la page de paiement (polling) ET la réconciliation (webhook + cron). */
export async function getSasPayPaymentStatus(paymentId: string): Promise<SasPayPaymentStatus | null> {
  const res = await fetch(`${SASPAY_API_BASE}/payments/${paymentId}/verify/`, {
    headers: { Authorization: `Bearer ${getSasPayApiKey()}` }
  });
  if (res.status === 404) return null;
  const parsed = await parseEnveloppe<{ id: string; status: string; requested_amount: string; currency: string }>(res);
  if (!parsed.ok) throw new Error(parsed.message);
  return { id: parsed.data.id, status: parsed.data.status, requestedAmount: parsed.data.requested_amount, currency: parsed.data.currency };
}

/**
 * Deuxième étape pour les réseaux qui l'exigent (rare — ex: Wizall Sénégal,
 * Coris Bénin, liste non exhaustive selon SasPay). Si le réseau n'en a pas
 * besoin, SasPay répond 400 `otp_not_applicable` — jamais utilisé dans le
 * flux normal, seulement si le client indique avoir reçu un code.
 */
export async function confirmSasPayOtp(paymentId: string, otp: string): Promise<{ status: string }> {
  const res = await fetch(`${SASPAY_API_BASE}/payments/${paymentId}/confirm-otp/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getSasPayApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ otp })
  });
  const parsed = await parseEnveloppe<{ status: string }>(res);
  if (!parsed.ok) throw new Error(parsed.message);
  return { status: parsed.data.status };
}
