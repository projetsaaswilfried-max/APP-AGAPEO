import "server-only";
import { getSasPayApiKey } from "@/config/env";

const SASPAY_API_BASE = "https://api.saspay.me/api/v1";

export interface InitiateSasPayCheckoutInput {
  amountFcfa: number;
  email: string;
  fullName: string;
  /** ISO2, ex: "BJ" — présélectionne le pays sur la page de paiement, optionnel côté SasPay. */
  countryCode?: string | null;
  phoneNumber?: string | null;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}

export interface SasPayCheckoutSession {
  id: string;
  checkoutUrl: string | null;
  status: "PENDING" | "SUCCESS" | "CANCELLED" | "EXPIRED" | string;
  amount: string;
  currency: string;
  transaction: string | null;
  paidAt: string | null;
}

interface SasPayCheckoutSessionRaw {
  id: string;
  checkout_url: string | null;
  status: string;
  amount: string;
  currency: string;
  transaction: string | null;
  paid_at: string | null;
}

function mapSession(raw: SasPayCheckoutSessionRaw): SasPayCheckoutSession {
  return {
    id: raw.id,
    checkoutUrl: raw.checkout_url,
    status: raw.status,
    amount: raw.amount,
    currency: raw.currency,
    transaction: raw.transaction,
    paidAt: raw.paid_at
  };
}

/**
 * Crée une session de checkout hébergé SasPay — le client choisit lui-même
 * son réseau mobile money/carte sur leur page, pas besoin de le déterminer
 * nous-mêmes contrairement à leur endpoint "softpay" (paiement direct).
 * SasPay facture nativement en XOF (`amount` = chaîne décimale, ex "5000.00")
 * — utiliser directement PREMIUM_PLANS[plan].priceFcfa, jamais une conversion
 * USD->XOF qui diffèrerait du montant réellement affiché aux membres.
 *
 * Pas de corrélation possible via le webhook (leur payload ne renvoie ni
 * `metadata` ni l'identifiant de cette session, cf. saspay-webhook-handler.ts)
 * — `metadata` est envoyé pour la traçabilité côté tableau de bord SasPay
 * uniquement ; l'activation réelle se fait par réconciliation sur l'id de
 * session que NOUS stockons (`provider_reference`), jamais par lecture du
 * webhook lui-même.
 */
export async function initiateSasPayCheckout(input: InitiateSasPayCheckoutInput): Promise<SasPayCheckoutSession> {
  const res = await fetch(`${SASPAY_API_BASE}/checkout-sessions/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSasPayApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: input.amountFcfa.toFixed(2),
      currency: "XOF",
      description: input.description,
      country: input.countryCode || undefined,
      customer_email: input.email,
      customer_name: input.fullName,
      customer_phone: input.phoneNumber || undefined,
      return_url: input.returnUrl,
      metadata: input.metadata
    })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.id) {
    throw new Error(json?.message || `Le paiement n'a pas pu être initié (code ${res.status}).`);
  }

  return mapSession(json as SasPayCheckoutSessionRaw);
}

/** Lecture d'une session existante — utilisée par la réconciliation pour savoir si elle a fini par être payée. */
export async function getSasPayCheckoutSession(sessionId: string): Promise<SasPayCheckoutSession | null> {
  const res = await fetch(`${SASPAY_API_BASE}/checkout-sessions/${sessionId}/`, {
    headers: { Authorization: `Bearer ${getSasPayApiKey()}` }
  });
  if (res.status === 404) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.id) {
    throw new Error(json?.message || `Lecture de la session SasPay ${sessionId} échouée (code ${res.status}).`);
  }
  return mapSession(json as SasPayCheckoutSessionRaw);
}
