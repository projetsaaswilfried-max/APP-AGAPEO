import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChariowPulseSecret } from "@/config/env";
import { sendPremiumActivatedEmail } from "@/lib/premium-emails";

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

const SUBSCRIPTION_PERIOD_DAYS = 30;
const PREMIUM_PLAN = "premium_monthly";

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
 * Réception des "Pulses" (webhooks) Chariow. Chariow ne gère pas les
 * abonnements récurrents — chaque `successful.sale` correspond à un paiement
 * unique de 30 jours d'accès Premium, qu'on active ici nous-mêmes.
 * Idempotent via la contrainte unique transactions(provider, provider_reference) :
 * un retry (jusqu'à 5x côté Chariow) ne double jamais l'activation.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-chariow-signature");

  let secret: string;
  try {
    secret = getChariowPulseSecret();
  } catch {
    console.error("Webhook Chariow reçu mais CHARIOW_PULSE_SECRET n'est pas configuré.");
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 500 });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

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

  // Idempotence à deux niveaux : Chariow relivre un même évènement jusqu'à 5x
  // s'il ne reçoit pas 200 assez vite, ET un même sale.id peut légitimement
  // passer par plusieurs statuts (ex. failed.sale puis successful.sale si le
  // client retente son paiement sur la même session). On ne doit donc étendre
  // l'abonnement QUE lors de la transition vers SUCCEEDED — jamais sur un
  // simple retry d'un évènement déjà traité, sous peine d'offrir des mois
  // d'accès gratuits à chaque nouvelle tentative de livraison du webhook.
  const { data: existingTx } = await admin
    .from("transactions")
    .select("status")
    .eq("provider", "chariow")
    .eq("provider_reference", sale.id)
    .maybeSingle();

  const alreadySucceeded = existingTx?.status === "SUCCEEDED";

  const { error: txError } = await admin.from("transactions").upsert(
    {
      user_id: userId,
      amount_cents: Math.round(sale.amount.value * 100),
      currency: sale.amount.currency,
      status: transactionStatus,
      plan: PREMIUM_PLAN,
      provider: "chariow",
      provider_reference: sale.id
    },
    { onConflict: "provider,provider_reference" }
  );

  if (txError) {
    console.error(`Échec d'enregistrement de la transaction Chariow ${sale.id} :`, txError.message);
    return NextResponse.json({ error: "Échec d'enregistrement." }, { status: 500 });
  }

  if (transactionStatus === "SUCCEEDED" && !alreadySucceeded) {
    const { data: restricted } = await admin
      .from("profile_restricted")
      .select("subscription_current_period_end")
      .eq("id", userId)
      .maybeSingle();

    const currentEnd = restricted?.subscription_current_period_end ? new Date(restricted.subscription_current_period_end) : null;
    const base = currentEnd && currentEnd > new Date() ? currentEnd : new Date();
    const newPeriodEnd = new Date(base.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const { error: subError } = await admin
      .from("profile_restricted")
      .update({
        subscription_status: "ACTIVE",
        subscription_plan: PREMIUM_PLAN,
        subscription_current_period_end: newPeriodEnd.toISOString(),
        subscription_reminder_stage: null
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
      await sendPremiumActivatedEmail(authUser.user.email, memberProfile.first_name, sale.amount, newPeriodEnd);
    }
  }

  return NextResponse.json({ received: true });
}
