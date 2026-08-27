// Cron quotidien : relance par email, 3 jours après une transaction Chariow
// passée en FAILED (paiement échoué ou abandonné), pour inviter la personne à
// réessayer — et si le problème persiste, à contacter support@agapeo.love.
// Un seul envoi par transaction, suivi via transactions.failure_reminder_sent.
// Si la personne a entre-temps réussi un paiement (subscription_status ACTIVE),
// on ne relance pas — le problème est déjà résolu.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const SUPPORT_EMAIL = "support@agapeo.love";

const REMINDER_DELAY_DAYS = 3;

const PLAN_LABELS: Record<string, string> = {
  premium_monthly: "Premium mensuel",
  premium_quarterly: "Premium trimestriel"
};

interface FailedTransactionRow {
  id: string;
  user_id: string;
  plan: string | null;
  created_at: string;
}

async function sendResendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant — email non envoyé.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend a refusé l'envoi (${res.status}) : ${body}`);
  }
}

async function sendFailedPaymentReminderEmail(to: string, firstName: string, planLabel: string) {
  await sendResendEmail(
    to,
    "Ton paiement Agapeo n'a pas abouti",
    buildAgapeoEmailHtml({
      title: "Ton paiement n'a pas abouti",
      eyebrow: "PREMIUM",
      headline: "On dirait que ton paiement a échoué",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Il y a quelques jours, ta tentative de paiement pour l'offre <strong>${planLabel}</strong> sur Agapeo n'a pas
          abouti — ça arrive parfois (carte refusée, session expirée, coupure de connexion...).
        </p>
        <p style="margin:0 0 12px 0;">Tu peux réessayer dès maintenant, ça ne prend qu'une minute.</p>
        <p style="margin:0;">
          Si le problème persiste, écris-nous directement à
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#FE70B2;">${SUPPORT_EMAIL}</a> — on t'aidera à finaliser ton
          abonnement.
        </p>
      `,
      ctaText: "Réessayer mon paiement",
      ctaUrl: `${SITE_URL}/premium`
    })
  );
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const thresholdIso = new Date(Date.now() - REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("transactions")
    .select("id, user_id, plan, created_at")
    .eq("status", "FAILED")
    .eq("failure_reminder_sent", false)
    .lte("created_at", thresholdIso);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: { transactionId: string; sent: boolean; reason?: string }[] = [];

  for (const row of (rows ?? []) as FailedTransactionRow[]) {
    // Déjà résolu entre-temps (un paiement ultérieur a réussi) — pas de relance.
    const { data: restricted } = await admin
      .from("profile_restricted")
      .select("subscription_status")
      .eq("id", row.user_id)
      .maybeSingle();

    if (restricted?.subscription_status === "ACTIVE") {
      await admin.from("transactions").update({ failure_reminder_sent: true }).eq("id", row.id);
      results.push({ transactionId: row.id, sent: false, reason: "Déjà abonné depuis" });
      continue;
    }

    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", row.user_id).maybeSingle();
    const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
    const email = authUser?.user?.email;

    if (!email) {
      results.push({ transactionId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    const planLabel = (row.plan && PLAN_LABELS[row.plan]) || "Premium";

    try {
      await sendFailedPaymentReminderEmail(email, profile?.first_name ?? "Membre", planLabel);
      await admin.from("transactions").update({ failure_reminder_sent: true }).eq("id", row.id);
      results.push({ transactionId: row.id, sent: true });
    } catch (err) {
      results.push({ transactionId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(JSON.stringify({ reminders: results }), {
    headers: { "Content-Type": "application/json" }
  });
});
