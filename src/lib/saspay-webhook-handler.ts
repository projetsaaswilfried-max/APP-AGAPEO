import "server-only";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSasPayWebhookSecret, env } from "@/config/env";
import { getSasPayPaymentStatus } from "@/lib/saspay";
import { sendPremiumActivatedEmail } from "@/lib/premium-emails";
import { sendMetaPurchaseEvent } from "@/lib/meta-conversions-api";
import { PREMIUM_PLANS, planKeyFromDbValue } from "@/domain/premium-plans";

const TOLERANCE_SECONDS = 300;

/** Comparaison en temps constant — évite qu'une attaque par timing ne révèle le secret. */
function verifySignature(rawBody: string, signature: string | null, timestamp: string | null, secret: string): boolean {
  if (!signature || !timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

/**
 * Le webhook SasPay ne porte ni `metadata` ni identifiant permettant de
 * remonter jusqu'à notre transaction (confirmé en lisant leur documentation
 * complète : `data` d'un `transaction.success` contient id/reference/amount/
 * currency/network/msisdn, jamais de champ personnalisé) — contrairement à
 * Chariow, il ne peut donc pas transporter l'identité du membre. On l'utilise
 * uniquement comme signal "va vérifier maintenant" : dès qu'un évènement
 * signé arrive, on réconcilie toutes nos transactions SasPay en attente
 * contre l'état réel de leur paiement (`GET /payments/{id}/verify/`, dont
 * l'id EST lié à `agapeo_user_id` par nous à la création — cf.
 * initiateMobileMoneyPaymentAction). Le cron saspay-payment-reconciliation
 * fait la même chose en continu, indépendamment du webhook — filet de
 * sécurité si un webhook n'arrive jamais (déjà vécu avec Chariow). La page de
 * paiement elle-même sonde aussi ce même statut pendant que le client
 * confirme sur son téléphone, pour une activation instantanée dès que
 * possible plutôt que d'attendre le webhook ou le cron.
 */
export async function handleSasPayWebhook(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  let secret: string;
  try {
    secret = getSasPayWebhookSecret();
  } catch {
    console.error("Webhook SasPay reçu mais le secret n'est pas configuré.");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 500 });
  }

  if (!verifySignature(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  try {
    await reconcilePendingSasPayTransactions();
  } catch (err) {
    console.error("Réconciliation SasPay déclenchée par webhook en échec :", err);
    // Toujours 200 : le webhook a été authentifié et traité, une erreur de
    // réconciliation ne doit pas faire réessayer SasPay indéfiniment — le
    // cron reprendra à la prochaine exécution.
  }

  return NextResponse.json({ received: true });
}

interface PendingSasPayTransaction {
  id: string;
  user_id: string;
  plan: string | null;
  /** Montant réellement demandé à la création (déjà converti dans sa devise locale, cf. src/lib/fx-rates.ts) — jamais recalculé ici depuis le prix FCFA du plan, qui ne correspond qu'aux pays en Franc CFA. */
  amount_cents: number;
  currency: string;
}

/**
 * Active l'abonnement d'UNE transaction SasPay déjà confirmée `SUCCESS` côté
 * plateforme. Idempotent (revendication atomique sur `status = 'PENDING'`) :
 * appelable en parallèle par le polling de la page de paiement, le webhook et
 * le cron sans jamais prolonger deux fois le même abonnement — un seul gagne.
 * Retourne `true` si CET appel a réalisé l'activation (utile à la page de
 * paiement pour savoir si elle doit afficher la confirmation).
 */
export async function activateSasPayTransaction(tx: PendingSasPayTransaction, requestedAmount: string): Promise<boolean> {
  if (!tx.plan) return false;
  const admin = createAdminClient();

  const planKey = planKeyFromDbValue(tx.plan);
  if (!planKey) return false;
  const plan = PREMIUM_PLANS[planKey];

  // Garde-fou de configuration, même principe que côté Chariow : si le
  // montant réellement payé ne correspond pas à celui demandé à la création
  // de CETTE transaction (déjà converti dans sa devise locale, jamais
  // `plan.priceFcfa` qui n'est valable que pour les pays en Franc CFA), on
  // n'accorde pas l'accès sur la seule foi que le statut est "SUCCESS".
  const expectedAmount = tx.amount_cents / 100;
  if (Math.round(Number(requestedAmount)) !== expectedAmount) {
    console.error(
      `Paiement SasPay ${tx.id} : montant ${requestedAmount} ${tx.currency} ne correspond pas au montant attendu (${expectedAmount} ${tx.currency}) — accès NON accordé.`
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
    // value en USD (pas XOF) pour rester cohérent avec le suivi Meta déjà en
    // place côté Chariow — l'attribution ROAS raisonne dans une seule devise.
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

/**
 * Compare chaque transaction SasPay encore PENDING chez nous à l'état réel de
 * son paiement côté SasPay, et active l'abonnement de celles réussies.
 */
export async function reconcilePendingSasPayTransactions(): Promise<{ checked: number; activated: string[] }> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("transactions")
    .select("id, user_id, plan, provider_reference, amount_cents, currency")
    .eq("provider", "saspay")
    .eq("status", "PENDING");

  const activated: string[] = [];

  for (const tx of pending ?? []) {
    if (!tx.provider_reference || !tx.plan) continue;

    let payment;
    try {
      payment = await getSasPayPaymentStatus(tx.provider_reference);
    } catch (err) {
      console.error(`Lecture paiement SasPay ${tx.provider_reference} échouée :`, err);
      continue;
    }
    if (!payment) continue;

    if (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "EXPIRED") {
      await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
      continue;
    }

    if (payment.status !== "SUCCESS") continue;

    const didActivate = await activateSasPayTransaction(
      { id: tx.id, user_id: tx.user_id, plan: tx.plan, amount_cents: tx.amount_cents, currency: tx.currency },
      payment.requestedAmount
    );
    if (didActivate) activated.push(tx.id);
  }

  return { checked: (pending ?? []).length, activated };
}
