import "server-only";
import { getChariowApiKey, getChariowProductId, type ChariowPlanKey } from "@/config/env";

const CHARIOW_API_BASE = "https://api.chariow.com/v1";

export interface InitiateChariowCheckoutInput {
  plan: ChariowPlanKey;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phoneCountryCode: string;
  redirectUrl: string;
  customMetadata?: Record<string, string>;
}

export interface ChariowCheckoutResult {
  step: "payment" | "completed" | "already_purchased";
  purchaseId: string | null;
  checkoutUrl: string | null;
}

/**
 * Initie un paiement unique sur le produit Chariow du plan choisi (mensuel
 * ou trimestriel — deux produits distincts côté Chariow, cf. `PREMIUM_PLANS`).
 * Chariow ne gère pas les abonnements récurrents (confirmé dans sa doc) : on
 * reconstruit la récurrence côté application via `subscription_current_period_end`,
 * chaque paiement renouvelant manuellement la durée du plan.
 */
export async function initiateChariowCheckout(input: InitiateChariowCheckoutInput): Promise<ChariowCheckoutResult> {
  const res = await fetch(`${CHARIOW_API_BASE}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getChariowApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      product_id: getChariowProductId(input.plan),
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: { number: input.phoneNumber, country_code: input.phoneCountryCode },
      payment_currency: "USD",
      redirect_url: input.redirectUrl,
      custom_metadata: input.customMetadata
    })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    throw new Error(json?.message || `Le paiement n'a pas pu être initié (code ${res.status}).`);
  }

  const data = json.data as {
    step: ChariowCheckoutResult["step"];
    purchase?: { id?: string };
    payment?: { checkout_url?: string };
  };

  return {
    step: data.step,
    purchaseId: data.purchase?.id ?? null,
    checkoutUrl: data.payment?.checkout_url ?? null
  };
}
