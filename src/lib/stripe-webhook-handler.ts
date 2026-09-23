import "server-only";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeSecretKey, getStripeWebhookSecret, env } from "@/config/env";
import { sendPremiumActivatedEmail } from "@/lib/premium-emails";
import { sendMetaPurchaseEvent } from "@/lib/meta-conversions-api";
import { PREMIUM_PLANS, planKeyFromDbValue } from "@/domain/premium-plans";

/**
 * Réception du webhook Stripe (endpoint unique, tous plans confondus — cf.
 * src/lib/stripe.ts). `checkout.session.completed` se déclenche dès qu'un
 * paiement carte aboutit ; la transaction correspondante existe déjà en
 * PENDING (créée à l'ouverture de la session), donc ce webhook n'a besoin que
 * de la retrouver par `provider_reference = session.id`, jamais de refaire
 * transiter l'identité du membre par les metadata. Filet de sécurité
 * indépendant : le cron stripe-payment-reconciliation (toutes les minutes),
 * même principe que pour Chariow/SasPay.
 */
export async function handleStripeWebhook(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(getStripeSecretKey());
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", getStripeWebhookSecret());
  } catch (err) {
    console.error("Signature webhook Stripe invalide :", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  try {
    await activateStripeTransaction(session.id, session.amount_total);
  } catch (err) {
    console.error(`Activation Stripe ${session.id} en échec :`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Échec d'activation." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Active l'abonnement d'UNE session Stripe déjà payée. Idempotent
 * (revendication atomique sur `status = 'PENDING'`) : appelable par le
 * webhook ET le cron de réconciliation sans jamais prolonger deux fois le
 * même abonnement — un seul gagne. Retourne `true` si CET appel a réalisé
 * l'activation.
 */
export async function activateStripeTransaction(sessionId: string, amountTotal: number | null): Promise<boolean> {
  const admin = createAdminClient();

  const { data: tx } = await admin
    .from("transactions")
    .select("id, user_id, plan, amount_cents, currency")
    .eq("provider", "stripe")
    .eq("provider_reference", sessionId)
    .maybeSingle();
  if (!tx || !tx.plan) return false;

  const planKey = planKeyFromDbValue(tx.plan);
  if (!planKey) return false;
  const plan = PREMIUM_PLANS[planKey];

  // Garde-fou de configuration, même principe que Chariow/SasPay : si le
  // montant réellement payé ne correspond pas à celui demandé à la création
  // de CETTE transaction, on n'accorde pas l'accès sur la seule foi que le
  // paiement est marqué "paid".
  if (amountTotal === null || Math.round(amountTotal) !== tx.amount_cents) {
    console.error(
      `Paiement Stripe ${sessionId} : montant reçu ${amountTotal} ne correspond pas au montant attendu (${tx.amount_cents}) — accès NON accordé.`
    );
    return false;
  }

  const { data: claimedRows } = await admin
    .from("transactions")
    .update({ status: "SUCCEEDED", premium_granted_at: new Date().toISOString() })
    .eq("id", tx.id)
    .eq("status", "PENDING")
    .select("id");
  if (!claimedRows || claimedRows.length === 0) return false;

  const { data: restricted } = await admin
    .from("profile_restricted")
    .select("subscription_current_period_end")
    .eq("id", tx.user_id)
    .maybeSingle();

  const currentEnd = restricted?.subscription_current_period_end ? new Date(restricted.subscription_current_period_end) : null;
  const base = currentEnd && currentEnd > new Date() ? currentEnd : new Date();
  const newPeriodEnd = new Date(base.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);

  await admin
    .from("profile_restricted")
    .update({
      subscription_status: "ACTIVE",
      subscription_plan: plan.dbValue,
      subscription_current_period_end: newPeriodEnd.toISOString(),
      subscription_reminder_stage: null,
      subscription_expired_at: null,
      subscription_expiry_followup_sent: false
    })
    .eq("id", tx.user_id);

  const [{ data: memberProfile }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("first_name").eq("id", tx.user_id).maybeSingle(),
    admin.auth.admin.getUserById(tx.user_id)
  ]);
  if (memberProfile && authUser?.user?.email) {
    await sendPremiumActivatedEmail(
      authUser.user.email,
      memberProfile.first_name,
      { value: tx.amount_cents / 100, currency: tx.currency },
      newPeriodEnd,
      plan.periodDays
    );
    await sendMetaPurchaseEvent({
      eventId: `${tx.user_id}:${Math.floor(newPeriodEnd.getTime() / 1000)}`,
      email: authUser.user.email,
      userId: tx.user_id,
      value: plan.priceUsd,
      currency: "USD",
      eventSourceUrl: `${env.siteUrl}/premium/success`
    });
  }

  return true;
}
