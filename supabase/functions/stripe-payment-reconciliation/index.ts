// Cron toutes les minutes : filet de sécurité contre les paiements Stripe
// réels qui n'activent jamais l'abonnement côté Agapeo (webhook jamais
// livré...) — même principe que chariow-payment-reconciliation et
// saspay-payment-reconciliation. Chaque session Stripe est stockée par nous
// en PENDING (`transactions.provider_reference` = id de la session) au
// moment de sa création (cf. initiateStripeCheckout côté app Next.js) — cette
// fonction compare simplement l'état réel de chaque session encore PENDING
// chez nous à Stripe (GET /v1/checkout/sessions/{id}).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_API_BASE = "https://api.stripe.com/v1";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const META_PIXEL_ID = Deno.env.get("META_PIXEL_ID");
const META_CONVERSIONS_API_TOKEN = Deno.env.get("META_CONVERSIONS_API_TOKEN");

// Source de vérité : src/domain/premium-plans.ts — resynchroniser ici si les
// prix/durées changent (Deno et Node ne peuvent pas partager ce module).
const PLAN_INFO: Record<string, { periodDays: number; priceUsd: number }> = {
  premium_weekly: { periodDays: 7, priceUsd: 4 },
  premium_half_month: { periodDays: 15, priceUsd: 7 },
  premium_monthly: { periodDays: 30, priceUsd: 12 },
  premium_quarterly: { periodDays: 90, priceUsd: 30 },
  premium_access: { periodDays: 30, priceUsd: 7 }
};

interface StripeSession {
  id: string;
  status: string; // "open" | "complete" | "expired"
  payment_status: string; // "paid" | "unpaid" | "no_payment_required"
  amount_total: number | null;
}

async function getCheckoutSession(sessionId: string): Promise<StripeSession | null> {
  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lecture session ${sessionId} échouée (${res.status})`);
  return await res.json();
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

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY manquant." }), { status: 500 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: pending } = await admin
    .from("transactions")
    .select("id, user_id, plan, provider_reference, amount_cents, currency")
    .eq("provider", "stripe")
    .eq("status", "PENDING");

  const results: { transactionId: string; outcome: string }[] = [];

  for (const tx of pending ?? []) {
    if (!tx.provider_reference || !tx.plan) continue;
    const plan = PLAN_INFO[tx.plan];
    if (!plan) continue;

    let session: StripeSession | null;
    try {
      session = await getCheckoutSession(tx.provider_reference);
    } catch (err) {
      results.push({ transactionId: tx.id, outcome: `Erreur lecture session : ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }
    if (!session) {
      // Ne devrait jamais arriver (Stripe ne supprime pas ses sessions) —
      // traité comme un échec plutôt que de rester PENDING pour toujours.
      await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
      results.push({ transactionId: tx.id, outcome: "Marquée FAILED (introuvable côté Stripe, 404)" });
      continue;
    }

    if (session.status === "expired") {
      await admin.from("transactions").update({ status: "FAILED" }).eq("id", tx.id).eq("status", "PENDING");
      results.push({ transactionId: tx.id, outcome: "Marquée FAILED (session expirée sans paiement)" });
      continue;
    }

    if (session.payment_status !== "paid") continue;

    // Comparé au montant réellement demandé à la création de CETTE
    // transaction, jamais recalculé depuis plan.priceUsd (au cas où le prix
    // du plan aurait changé entre-temps).
    if (session.amount_total === null || Math.round(session.amount_total) !== tx.amount_cents) {
      results.push({
        transactionId: tx.id,
        outcome: `IGNORÉE — montant ${session.amount_total} ne correspond pas au montant attendu (${tx.amount_cents})`
      });
      continue;
    }

    // Revendication atomique — un webhook et ce cron peuvent se chevaucher.
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
      await sendActivationEmail(authUser.user.email, memberProfile.first_name, tx.amount_cents / 100, tx.currency, newPeriodEnd, plan.periodDays);
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
