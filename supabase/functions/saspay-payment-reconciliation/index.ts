// Cron toutes les minutes : filet de sécurité contre les paiements SasPay
// réels qui n'activent jamais l'abonnement côté Agapeo (webhook jamais livré,
// incident ponctuel côté SasPay...) — même principe que
// chariow-payment-reconciliation, mais la corrélation est ici directe : le
// webhook SasPay ne porte aucune métadonnée permettant de retrouver le
// membre (confirmé dans leur documentation), donc chaque paiement softpay
// est stocké par nous en PENDING (`transactions.provider_reference` = id du
// paiement) au moment de sa création (cf. initiateMobileMoneyPaymentAction
// côté app Next.js) — cette fonction compare simplement l'état réel de
// chaque paiement encore PENDING chez nous à SasPay
// (GET /payments/{id}/verify/).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const SASPAY_API_KEY = Deno.env.get("SASPAY_API_KEY");
const SASPAY_API_BASE = "https://api.saspay.me/api/v1";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const META_CONVERSIONS_API_TOKEN = Deno.env.get("META_CONVERSIONS_API_TOKEN");

// Source de vérité : src/domain/premium-plans.ts — resynchroniser ici si les
// prix/durées changent (Deno et Node ne peuvent pas partager ce module).
const PLAN_INFO: Record<string, { periodDays: number; priceFcfa: number; priceUsd: number }> = {
  premium_weekly: { periodDays: 7, priceFcfa: 2335, priceUsd: 4 },
  premium_half_month: { periodDays: 15, priceFcfa: 4086, priceUsd: 7 },
  premium_monthly: { periodDays: 30, priceFcfa: 7003, priceUsd: 12 },
  premium_quarterly: { periodDays: 90, priceFcfa: 17507, priceUsd: 30 },
  premium_access: { periodDays: 30, priceFcfa: 4086, priceUsd: 7 }
};

interface SasPayPaymentStatus {
  id: string;
  status: string;
  requested_amount: string;
}

async function getPaymentStatus(paymentId: string): Promise<SasPayPaymentStatus | null> {
  const res = await fetch(`${SASPAY_API_BASE}/payments/${paymentId}/verify/`, {
    headers: { Authorization: `Bearer ${SASPAY_API_KEY}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lecture paiement ${paymentId} échouée (${res.status})`);
  // Réponse réelle enveloppée dans { success, data, code } — vérifié en
  // direct le 2026-09-04, contrairement aux exemples "à plat" de leur doc.
  const json = await res.json();
  return json?.data ?? null;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendMetaPurchaseEvent(eventId: string, email: string, userId: string, valueUsd: number, eventSourceUrl: string) {
  if (!META_PIXEL_ID || !META_CONVERSIONS_API_TOKEN) return;
  try {
    await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_CONVERSIONS_API_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: eventSourceUrl,
            action_source: "system_generated",
            user_data: { em: [await sha256Hex(email.trim().toLowerCase())], external_id: [await sha256Hex(userId)] },
            custom_data: { value: valueUsd, currency: "USD" }
          }
        ]
      })
    });
  } catch {
    // Best-effort — l'activation Premium est déjà faite, ce n'est qu'un signal publicitaire.
  }
}

async function sendActivationEmail(to: string, firstName: string, amount: number, currency: string, periodEnd: Date, periodDays: number) {
  if (!RESEND_API_KEY) return;
  try {
    const html = buildAgapeoEmailHtml({
      title: "Bienvenue dans Agapeo Premium",
      eyebrow: "PREMIUM",
      headline: "Félicitations, ton abonnement est actif !",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Merci pour ta confiance — ton paiement a bien été reçu et ton accès Premium est actif dès maintenant.
          Tu peux désormais contacter en priorité, voir qui s'intéresse à toi, utiliser les filtres avancés et
          consulter les profils sans limite.
        </p>
        <p style="margin:0;color:#94A3B8;font-size:12px;">
          Ton accès est valable ${periodDays} jours — renouvelable à tout moment depuis l'onglet "Mon Plan" de ton compte.
        </p>
      `,
      infoRows: [
        { label: "Montant", value: `${amount} ${currency}` },
        { label: "Valable jusqu'au", value: periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) }
      ],
      ctaText: "Découvrir Premium",
      ctaUrl: `${SITE_URL}/premium`
    });
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Agapeo <support@agapeo.love>", to: [to], subject: "Bienvenue dans Agapeo Premium !", html })
    });
  } catch {
    // Best-effort.
  }
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  if (!SASPAY_API_KEY) {
    return new Response(JSON.stringify({ error: "SASPAY_API_KEY manquant." }), { status: 500 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending } = await admin
    .from("transactions")
    .select("id, user_id, plan, provider_reference, amount_cents, currency")
    .eq("provider", "saspay")
    .eq("status", "PENDING");

  const results: { transactionId: string; outcome: string }[] = [];

  for (const tx of pending ?? []) {
    if (!tx.provider_reference || !tx.plan) continue;
    const plan = PLAN_INFO[tx.plan];
    if (!plan) continue;

    let payment: SasPayPaymentStatus | null;
    try {
      payment = await getPaymentStatus(tx.provider_reference);
    } catch (err) {
      results.push({ transactionId: tx.id, outcome: `Erreur lecture paiement : ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }
    if (!payment) continue;

    if (payment.status === "FAILED" || payment.status === "CANCELLED" || payment.status === "EXPIRED") {
      await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
      results.push({ transactionId: tx.id, outcome: `Marquée FAILED (paiement ${payment.status})` });
      continue;
    }

    if (payment.status !== "SUCCESS") continue;

    // Comparé au montant réellement demandé à la création de CETTE
    // transaction (déjà converti dans sa devise locale, cf.
    // src/lib/fx-rates.ts côté app Next.js) — jamais plan.priceFcfa, qui n'est
    // valable que pour les pays en Franc CFA (XOF/XAF).
    const expectedAmount = tx.amount_cents / 100;
    if (Math.round(Number(payment.requested_amount)) !== expectedAmount) {
      results.push({
        transactionId: tx.id,
        outcome: `IGNORÉE — montant ${payment.requested_amount} ${tx.currency} ne correspond pas au montant attendu (${expectedAmount} ${tx.currency})`
      });
      continue;
    }

    // Revendication atomique — un webhook, ce cron, et le polling de la page
    // de paiement peuvent tous se chevaucher.
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
        subscription_plan: tx.plan,
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
      await sendActivationEmail(authUser.user.email, memberProfile.first_name, expectedAmount, tx.currency, newPeriodEnd, plan.periodDays);
      await sendMetaPurchaseEvent(
        `${tx.user_id}:${Math.floor(newPeriodEnd.getTime() / 1000)}`,
        authUser.user.email,
        tx.user_id,
        plan.priceUsd,
        `${SITE_URL}/premium/success`
      );
    }

    results.push({ transactionId: tx.id, outcome: `ACTIVÉ (${tx.plan} jusqu'au ${newPeriodEnd.toISOString()})` });
  }

  return new Response(JSON.stringify({ checked: (pending ?? []).length, results }), {
    headers: { "Content-Type": "application/json" }
  });
});
