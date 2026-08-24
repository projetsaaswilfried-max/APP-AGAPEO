import "server-only";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChariowPulseSecret, env, type ChariowPlanKey } from "@/config/env";
import { sendPremiumActivatedEmail } from "@/lib/premium-emails";
import { sendMetaPurchaseEvent } from "@/lib/meta-conversions-api";
import { PREMIUM_PLANS } from "@/domain/premium-plans";

interface ChariowMoney {
  value: number;
  currency: string;
}

interface ChariowSaleEventPayload {
  event: string;
  sale: {
    id: string;
    amount: ChariowMoney;
    status: string;
    custom_metadata?: Record<string, string> | null;
  } | null;
}

const SALE_EVENT_TO_STATUS: Record<string, "SUCCEEDED" | "FAILED"> = {
  "successful.sale": "SUCCEEDED",
  "failed.sale": "FAILED",
  "abandoned.sale": "FAILED"
};

/** Comparaison en temps constant — évite qu'une attaque par timing ne révèle le secret. */
function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const received = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

/**
 * Réception des "Pulses" (webhooks) Chariow — une route par plan
 * (`/api/webhooks/chariow` pour le mensuel, `/api/webhooks/chariow/quarterly`
 * pour le trimestriel) car Chariow interdit de réutiliser une même URL sur
 * deux Pulses différents ; chaque route appelle cette fonction partagée avec
 * son propre `plan`, ce qui détermine à la fois quel secret vérifier et
 * quelle durée/valeur appliquer. Chariow ne gère pas les abonnements
 * récurrents — chaque `successful.sale` correspond à un paiement unique
 * d'accès Premium, qu'on active ici nous-mêmes.
 * Idempotent via la contrainte unique transactions(provider, provider_reference) :
 * un retry (jusqu'à 5x côté Chariow) ne double jamais l'activation.
 */
export async function handleChariowWebhook(request: Request, planKey: ChariowPlanKey): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-chariow-signature");

  let secret: string;
  try {
    secret = getChariowPulseSecret(planKey);
  } catch {
    console.error(`Webhook Chariow (${planKey}) reçu mais son secret de Pulse n'est pas configuré.`);
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 500 });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  const plan = PREMIUM_PLANS[planKey];

  let payload: ChariowSaleEventPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const sale = payload.sale;
  const transactionStatus = SALE_EVENT_TO_STATUS[payload.event];

  // Évènement hors périmètre pour nous (license.*, affiliate.*...) ou sans
  // objet "sale" exploitable — accusé de réception sans action, pour éviter
  // que Chariow ne réessaie indéfiniment un évènement qu'on ne traite pas.
  if (!sale || !transactionStatus) {
    return NextResponse.json({ received: true });
  }

  const userId = sale.custom_metadata?.agapeo_user_id ?? null;
  if (!userId) {
    // Ne devrait jamais arriver : startPremiumCheckoutAction fournit toujours
    // ce metadata. On log pour investigation mais on répond 200 — un retry
    // ne résoudra pas une metadata manquante à la source.
    console.error(`Webhook Chariow ${payload.event} sans agapeo_user_id (sale ${sale.id}) — transaction non enregistrée.`);
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Garde-fou de configuration : si le Pulse déclenché ne correspond pas au
  // prix attendu pour ce plan (mauvais produit branché sur ce Pulse, remise
  // appliquée côté Chariow, etc.), on enregistre la transaction pour
  // investigation mais on n'accorde PAS l'accès Premium sur la seule foi
  // que l'évènement s'est déclenché ici.
  const amountMatchesPlan =
    sale.amount.currency.toUpperCase() === "USD" && Math.round(sale.amount.value) === plan.priceUsd;

  const { error: txError } = await admin.from("transactions").upsert(
    {
      user_id: userId,
      amount_cents: Math.round(sale.amount.value * 100),
      currency: sale.amount.currency,
      status: transactionStatus,
      plan: plan.dbValue,
      provider: "chariow",
      provider_reference: sale.id
    },
    { onConflict: "provider,provider_reference" }
  );

  if (txError) {
    console.error(`Échec d'enregistrement de la transaction Chariow ${sale.id} :`, txError.message);
    return NextResponse.json({ error: "Échec d'enregistrement." }, { status: 500 });
  }

  if (transactionStatus === "SUCCEEDED" && !amountMatchesPlan) {
    console.error(
      `Webhook Chariow ${sale.id} (${planKey}) : montant reçu ${sale.amount.value} ${sale.amount.currency} ne correspond pas au prix attendu (${plan.priceUsd} USD) — transaction enregistrée mais accès Premium NON accordé.`
    );
    return NextResponse.json({ received: true });
  }

  // Revendication atomique : deux livraisons concurrentes du même évènement
  // (Chariow relivre jusqu'à 5x si notre 200 n'arrive pas assez vite) peuvent
  // toutes deux passer le contrôle ci-dessus si on lisait le statut avant
  // l'upsert — seule la requête qui réussit à faire passer
  // premium_granted_at de NULL à une date a le droit d'étendre l'abonnement.
  let wonClaim = false;
  if (transactionStatus === "SUCCEEDED") {
    const { data: claimedRows, error: claimError } = await admin
      .from("transactions")
      .update({ premium_granted_at: new Date().toISOString() })
      .eq("provider", "chariow")
      .eq("provider_reference", sale.id)
      .is("premium_granted_at", null)
      .select("id");

    if (claimError) {
      console.error(`Échec de la revendication d'activation pour ${sale.id} :`, claimError.message);
      return NextResponse.json({ error: "Échec d'activation." }, { status: 500 });
    }
    wonClaim = (claimedRows?.length ?? 0) > 0;
  }

  if (transactionStatus === "SUCCEEDED" && wonClaim) {
    const { data: restricted } = await admin
      .from("profile_restricted")
      .select("subscription_current_period_end")
      .eq("id", userId)
      .maybeSingle();

    const currentEnd = restricted?.subscription_current_period_end ? new Date(restricted.subscription_current_period_end) : null;
    const base = currentEnd && currentEnd > new Date() ? currentEnd : new Date();
    const newPeriodEnd = new Date(base.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);

    const { error: subError } = await admin
      .from("profile_restricted")
      .update({
        subscription_status: "ACTIVE",
        subscription_plan: plan.dbValue,
        subscription_current_period_end: newPeriodEnd.toISOString(),
        subscription_reminder_stage: null,
        subscription_expired_at: null,
        subscription_expiry_followup_sent: false
      })
      .eq("id", userId);

    if (subError) {
      console.error(`Transaction ${sale.id} enregistrée mais activation de l'abonnement échouée pour ${userId} :`, subError.message);
      return NextResponse.json({ error: "Échec d'activation." }, { status: 500 });
    }

    const [{ data: memberProfile }, { data: authUser }] = await Promise.all([
      admin.from("profiles").select("first_name").eq("id", userId).maybeSingle(),
      admin.auth.admin.getUserById(userId)
    ]);
    if (memberProfile && authUser?.user?.email) {
      await sendPremiumActivatedEmail(authUser.user.email, memberProfile.first_name, sale.amount, newPeriodEnd, plan.periodDays);
      // eventId dérivé de la même façon côté client (/premium/success) —
      // secondes epoch plutôt que la chaîne ISO brute, insensible aux
      // différences de sérialisation (précision, format) entre ce que ce
      // webhook calcule et ce qu'une lecture PostgREST renverrait.
      await sendMetaPurchaseEvent({
        eventId: `${userId}:${Math.floor(newPeriodEnd.getTime() / 1000)}`,
        email: authUser.user.email,
        userId,
        value: plan.priceUsd,
        currency: "USD",
        eventSourceUrl: `${env.siteUrl}/premium/success`
      });
    }
  }

  return NextResponse.json({ received: true });
}
