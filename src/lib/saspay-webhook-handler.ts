import "server-only";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSasPayWebhookSecret, env } from "@/config/env";
import { getSasPayCheckoutSession } from "@/lib/saspay";
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
 * currency/network/msisdn, jamais l'id de la session de checkout ni de champ
 * personnalisé) — contrairement à Chariow, il ne peut donc pas transporter
 * l'identité du membre. On l'utilise uniquement comme signal "va vérifier
 * maintenant" : dès qu'un évènement signé arrive, on réconcilie toutes nos
 * transactions SasPay en attente contre l'état réel de leur session
 * (`GET /checkout-sessions/{id}/`, qui EST liée à `agapeo_user_id` par nous,
 * au moment de sa création — cf. startSasPayCheckout). Le cron
 * saspay-payment-reconciliation fait exactement la même chose en continu,
 * indépendamment de la réception d'un webhook — filet de sécurité si un
 * webhook n'arrive jamais (déjà vécu avec Chariow, cf. memory correspondante).
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

/**
 * Compare chaque transaction SasPay encore PENDING chez nous à l'état réel de
 * sa session côté SasPay, et active l'abonnement de celles payées avec
 * succès. Idempotent (revendication atomique sur `status = 'PENDING'` avant
 * activation) : un appel concurrent (webhook + cron au même instant) ne peut
 * jamais prolonger deux fois le même abonnement.
 */
export async function reconcilePendingSasPayTransactions(): Promise<{ checked: number; activated: string[] }> {
  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("transactions")
    .select("id, user_id, plan, provider_reference")
    .eq("provider", "saspay")
    .eq("status", "PENDING");

  const activated: string[] = [];

  for (const tx of pending ?? []) {
    if (!tx.provider_reference || !tx.plan) continue;

    let session;
    try {
      session = await getSasPayCheckoutSession(tx.provider_reference);
    } catch (err) {
      console.error(`Lecture session SasPay ${tx.provider_reference} échouée :`, err);
      continue;
    }
    if (!session) continue;

    if (session.status === "CANCELLED" || session.status === "EXPIRED") {
      await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
      continue;
    }

    if (session.status !== "SUCCESS") continue;

    const planKey = planKeyFromDbValue(tx.plan);
    if (!planKey) continue;
    const plan = PREMIUM_PLANS[planKey];

    // Garde-fou de configuration, même principe que côté Chariow : si le
    // montant réellement payé ne correspond pas au plan attendu, on
    // n'accorde pas l'accès sur la seule foi que la session est "SUCCESS".
    if (Math.round(Number(session.amount)) !== plan.priceFcfa) {
      console.error(
        `Session SasPay ${tx.provider_reference} : montant ${session.amount} XOF ne correspond pas au plan ${planKey} (${plan.priceFcfa} XOF attendu) — accès NON accordé.`
      );
      continue;
    }

    // Revendication atomique : si le webhook et le cron se déclenchent au
    // même instant, un seul des deux gagne cette mise à jour.
    const { data: claimedRows } = await admin
      .from("transactions")
      .update({ status: "SUCCEEDED", premium_granted_at: new Date().toISOString() })
      .eq("id", tx.id)
      .eq("status", "PENDING")
      .select("id");
    if (!claimedRows || claimedRows.length === 0) continue;

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
        { value: plan.priceFcfa, currency: "XOF" },
        newPeriodEnd,
        plan.periodDays
      );
      // value en USD (pas XOF) pour rester cohérent avec le suivi Meta déjà
      // en place côté Chariow — l'attribution ROAS raisonne dans une seule devise.
      await sendMetaPurchaseEvent({
        eventId: `${tx.user_id}:${Math.floor(newPeriodEnd.getTime() / 1000)}`,
        email: authUser.user.email,
        userId: tx.user_id,
        value: plan.priceUsd,
        currency: "USD",
        eventSourceUrl: `${env.siteUrl}/premium/success`
      });
    }

    activated.push(tx.id);
  }

  return { checked: (pending ?? []).length, activated };
}
