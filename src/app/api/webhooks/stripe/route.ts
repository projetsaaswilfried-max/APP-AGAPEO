import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

/** Point de réception Stripe unique (tous plans confondus) — à enregistrer tel quel dans Développeurs → Webhooks du dashboard Stripe. */
export async function POST(request: Request) {
  return handleStripeWebhook(request);
}
