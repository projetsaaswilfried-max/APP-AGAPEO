import "server-only";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREMIUM_PLANS, type PremiumPlanKey } from "@/domain/premium-plans";

let cachedClient: Stripe | null = null;

/** Réutilisé d'un appel à l'autre (comme la connexion HTTP/OAuth mise en cache côté FCM) plutôt que reconstruit à chaque paiement. */
function getStripeClient(): Stripe {
  if (!cachedClient) cachedClient = new Stripe(getStripeSecretKey());
  return cachedClient;
}

export interface InitiateStripeCheckoutInput {
  plan: PremiumPlanKey;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Initie un paiement carte unique via Stripe Checkout (page hébergée, comme
 * Chariow). Le prix est généré à la volée (`price_data`) plutôt que de
 * référencer un Product/Price pré-créé côté Stripe — un seul webhook suffit
 * alors pour tous les plans (contrairement à Chariow, qui exige un Pulse
 * distinct par produit). Stripe ne gère pas d'abonnement récurrent ici : même
 * principe que Chariow/SasPay, chaque paiement prolonge manuellement
 * `subscription_current_period_end` (cf. activation dans stripe-webhook-handler.ts).
 * La transaction est enregistrée en PENDING dès la création de la session
 * (pas seulement au webhook) pour que la réconciliation périodique puisse
 * retrouver un paiement dont le webhook ne serait jamais arrivé.
 */
export async function initiateStripeCheckout(input: InitiateStripeCheckoutInput): Promise<string> {
  const plan = PREMIUM_PLANS[input.plan];
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan.priceUsd * 100,
          product_data: { name: `Abonnement Agapeo — ${plan.label}` }
        }
      }
    ],
    metadata: { agapeo_user_id: input.userId, agapeo_plan: input.plan },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl
  });

  if (!session.url) throw new Error("Le paiement n'a pas pu être initié.");

  const admin = createAdminClient();
  const { error } = await admin.from("transactions").upsert(
    {
      user_id: input.userId,
      amount_cents: plan.priceUsd * 100,
      currency: "USD",
      status: "PENDING",
      plan: plan.dbValue,
      provider: "stripe",
      provider_reference: session.id
    },
    { onConflict: "provider,provider_reference" }
  );
  if (error) throw new Error("Le paiement n'a pas pu être initié.");

  return session.url;
}
