// Cron toutes les 10 minutes : filet de sécurité contre les paiements Chariow
// réels qui n'activent jamais l'abonnement côté Agapeo (webhook jamais livré,
// signature momentanément mal configurée, incident ponctuel côté Chariow...).
// Compare les ventes "completed" de l'API Chariow (source de vérité côté
// paiement) aux transactions déjà enregistrées chez nous, et régularise
// automatiquement tout écart trouvé — même logique d'activation que
// chariow-webhook-handler.ts côté app Next.js (transaction idempotente via
// provider_reference, revendication atomique de premium_granted_at pour
// éviter qu'une double détection ne prolonge deux fois le même abonnement).
//
// Découvert le 2026-09-02 : plusieurs paiements réels (1 semaine, 4$) ont été
// reçus par Chariow sans jamais déclencher notre webhook — clients facturés,
// jamais activés, jusqu'à ce qu'on le remarque manuellement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const CHARIOW_API_KEY = Deno.env.get("CHARIOW_API_KEY");
const CHARIOW_API_BASE = "https://api.chariow.com/v1";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Ne remonte que les ventes récentes — les plus anciennes ont déjà été
// traitées par une exécution précédente (ou régularisées manuellement) ;
// limite le nombre d'appels à l'API Chariow à chaque exécution.
const LOOKBACK_HOURS = 24;

// Chaque plan vendu a un prix USD entier distinct (contrainte déjà imposée
// par le webhook, cf. PREMIUM_PLANS dans src/domain/premium-plans.ts, source
// de vérité — à resynchroniser ici si les prix changent) : le montant seul
// suffit donc à identifier le plan, sans dépendre de l'ID produit Chariow.
const PLAN_BY_AMOUNT: Record<number, { dbValue: string; periodDays: number }> = {
  4: { dbValue: "premium_weekly", periodDays: 7 },
  7: { dbValue: "premium_half_month", periodDays: 15 },
  12: { dbValue: "premium_monthly", periodDays: 30 },
  30: { dbValue: "premium_quarterly", periodDays: 90 }
};

interface ChariowSale {
  id: string;
  status: string;
  amount: { value: number; currency: string };
  created_at: string;
  completed_at: string | null;
  customer: { email: string };
}

async function fetchRecentCompletedSales(): Promise<ChariowSale[]> {
  const cutoff = Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000;
  const sales: ChariowSale[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < 20; page++) {
    const url: string = cursor ? `${CHARIOW_API_BASE}/sales?cursor=${cursor}` : `${CHARIOW_API_BASE}/sales`;
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${CHARIOW_API_KEY}` } });
    if (!res.ok) break;
    const json = await res.json();
    const data: ChariowSale[] = json.data ?? [];
    sales.push(...data.filter((s) => s.status === "completed" && s.completed_at));

    const oldest = data[data.length - 1];
    const oldestTime = oldest ? new Date(oldest.created_at).getTime() : 0;
    const pagination = json.pagination;
    if (data.length === 0 || oldestTime < cutoff || !pagination?.has_more_pages || !pagination?.next_cursor) break;
    cursor = pagination.next_cursor;
  }

  return sales.filter((s) => new Date(s.completed_at as string).getTime() >= cutoff);
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
    // Best-effort — l'activation en base est déjà faite, l'email n'est qu'une confirmation.
  }
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  if (!CHARIOW_API_KEY) {
    return new Response(JSON.stringify({ error: "CHARIOW_API_KEY manquant." }), { status: 500 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const sales = await fetchRecentCompletedSales();
  if (sales.length === 0) {
    return new Response(JSON.stringify({ checked: 0, fixed: [] }), { headers: { "Content-Type": "application/json" } });
  }

  const { data: existingTx } = await admin
    .from("transactions")
    .select("provider_reference")
    .eq("provider", "chariow")
    .in("provider_reference", sales.map((s) => s.id));
  const existingRefs = new Set((existingTx ?? []).map((t) => t.provider_reference));
  const missing = sales.filter((s) => !existingRefs.has(s.id));

  const results: { saleId: string; email: string; outcome: string }[] = [];

  if (missing.length > 0) {
    // Coûteux (liste tous les comptes) — n'exécuté que si un écart est réellement trouvé.
    const usersByEmail = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      for (const u of data.users) if (u.email) usersByEmail.set(u.email.toLowerCase(), u.id);
      if (data.users.length < 1000) break;
    }

    for (const sale of missing) {
      const plan = PLAN_BY_AMOUNT[Math.round(sale.amount.value)];
      if (!plan || sale.amount.currency.toUpperCase() !== "USD") {
        results.push({ saleId: sale.id, email: sale.customer.email, outcome: `IGNORÉ (montant ${sale.amount.value} ${sale.amount.currency} non reconnu)` });
        continue;
      }

      const userId = usersByEmail.get(sale.customer.email?.toLowerCase() ?? "");
      if (!userId) {
        results.push({ saleId: sale.id, email: sale.customer.email, outcome: "INTROUVABLE — aucun compte Agapeo avec cet email, à vérifier manuellement" });
        continue;
      }

      const amountCents = Math.round(sale.amount.value * 100);
      const { error: txError } = await admin.from("transactions").upsert(
        {
          user_id: userId,
          amount_cents: amountCents,
          currency: sale.amount.currency,
          status: "SUCCEEDED",
          plan: plan.dbValue,
          provider: "chariow",
          provider_reference: sale.id
        },
        { onConflict: "provider,provider_reference" }
      );
      if (txError) {
        results.push({ saleId: sale.id, email: sale.customer.email, outcome: `ÉCHEC enregistrement transaction : ${txError.message}` });
        continue;
      }

      // Revendication atomique — si une autre exécution (ou le webhook, livré
      // entre-temps) a déjà gagné la course, on ne prolonge pas une seconde fois.
      const { data: claimedRows } = await admin
        .from("transactions")
        .update({ premium_granted_at: new Date().toISOString() })
        .eq("provider", "chariow")
        .eq("provider_reference", sale.id)
        .is("premium_granted_at", null)
        .select("id");

      if (!claimedRows || claimedRows.length === 0) {
        results.push({ saleId: sale.id, email: sale.customer.email, outcome: "DÉJÀ ACTIVÉ ENTRE-TEMPS (course évitée)" });
        continue;
      }

      const { data: restricted } = await admin
        .from("profile_restricted")
        .select("subscription_current_period_end")
        .eq("id", userId)
        .maybeSingle();

      const completedAt = new Date(sale.completed_at as string);
      const currentEnd = restricted?.subscription_current_period_end ? new Date(restricted.subscription_current_period_end) : null;
      const base = currentEnd && currentEnd > completedAt ? currentEnd : completedAt;
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
        results.push({ saleId: sale.id, email: sale.customer.email, outcome: `ÉCHEC activation abonnement : ${subError.message}` });
        continue;
      }

      const { data: profile } = await admin.from("profiles").select("first_name").eq("id", userId).maybeSingle();
      if (profile) {
        await sendActivationEmail(sale.customer.email, profile.first_name, sale.amount.value, sale.amount.currency, newPeriodEnd, plan.periodDays);
      }

      results.push({ saleId: sale.id, email: sale.customer.email, outcome: `ACTIVÉ (${plan.dbValue} jusqu'au ${newPeriodEnd.toISOString()})` });
    }
  }

  return new Response(JSON.stringify({ checked: sales.length, missing: missing.length, fixed: results }), {
    headers: { "Content-Type": "application/json" }
  });
});
