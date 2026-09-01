// Cron toutes les 5 minutes : séquence de relance à 3 paliers après une
// transaction Chariow passée en FAILED (paiement échoué ou abandonné) —
// palier 0 à 5 minutes, palier 1 le lendemain (J+1), palier 2 à J+3 (dernier
// rappel, avec mention explicite de support@agapeo.love). Un seul envoi par
// palier et par transaction, suivi via transactions.failure_reminder_stage —
// même principe que onboarding_sequence_stage / premium_sequence_stage.
// Si la personne a entre-temps réussi un paiement (subscription_status
// ACTIVE), on arrête la séquence sans envoyer d'autre email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const SUPPORT_EMAIL = "support@agapeo.love";

// Index = palier. En minutes pour pouvoir exprimer "5 minutes" comme J+1/J+3.
const MILESTONES_MINUTES = [5, 24 * 60, 3 * 24 * 60];

const PLAN_LABELS: Record<string, string> = {
  premium_monthly: "Premium mensuel",
  premium_quarterly: "Premium trimestriel",
  premium_access: "Accès complet"
};

interface FailedTransactionRow {
  id: string;
  user_id: string;
  plan: string | null;
  created_at: string;
  failure_reminder_stage: number | null;
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

function applicableStage(minutesSince: number): number | undefined {
  // Le plus grand palier déjà atteint.
  for (let i = MILESTONES_MINUTES.length - 1; i >= 0; i--) {
    if (minutesSince >= MILESTONES_MINUTES[i]) return i;
  }
  return undefined;
}

async function sendFailedPaymentReminderEmail(to: string, firstName: string, planLabel: string, stage: number) {
  const configs = [
    {
      subject: "Ton paiement Agapeo n'a pas abouti",
      headline: "On dirait que ton paiement a échoué",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Ta tentative de paiement pour l'offre <strong>${planLabel}</strong> sur Agapeo n'a pas abouti — ça arrive
          parfois (carte refusée, session expirée, coupure de connexion...).
        </p>
        <p style="margin:0;">Tu peux réessayer dès maintenant, ça ne prend qu'une minute.</p>
      `
    },
    {
      subject: "Toujours pas réessayé ton paiement Agapeo ?",
      headline: "Ton offre Premium t'attend toujours",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Hier, ta tentative de paiement pour l'offre <strong>${planLabel}</strong> n'a pas abouti — ton accès Premium
          n'a donc pas pu être activé.
        </p>
        <p style="margin:0;">
          Si c'était un souci passager, réessaie dès maintenant. Et si le problème persiste, écris-nous à
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#FE70B2;">${SUPPORT_EMAIL}</a>, on t'aidera à le résoudre.
        </p>
      `
    },
    {
      subject: "Dernier rappel : ton paiement Agapeo n'a toujours pas abouti",
      headline: "On t'aide à finaliser ton abonnement",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Depuis 3 jours, ta tentative de paiement pour l'offre <strong>${planLabel}</strong> n'a pas abouti — voici
          notre dernier rappel automatique à ce sujet.
        </p>
        <p style="margin:0;">
          Si le problème persiste malgré une nouvelle tentative, contacte-nous directement à
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#FE70B2;">${SUPPORT_EMAIL}</a> — on se chargera de finaliser
          ton abonnement avec toi.
        </p>
      `
    }
  ];

  const cfg = configs[stage];
  await sendResendEmail(
    to,
    cfg.subject,
    buildAgapeoEmailHtml({
      title: cfg.subject,
      eyebrow: "PREMIUM",
      headline: cfg.headline,
      recipientFirstName: firstName,
      contentHtml: cfg.contentHtml,
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
  const now = new Date();

  // `failure_reminder_stage < 2` (ou NULL) exclut les séquences déjà
  // terminées — sans ça, cette requête re-récupérerait indéfiniment TOUTES
  // les transactions FAILED depuis le début, y compris celles dont les 3
  // paliers sont déjà envoyés depuis longtemps.
  const { data: rows, error } = await admin
    .from("transactions")
    .select("id, user_id, plan, created_at, failure_reminder_stage")
    .eq("status", "FAILED")
    .or(`failure_reminder_stage.is.null,failure_reminder_stage.lt.${MILESTONES_MINUTES.length - 1}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: { transactionId: string; sent: boolean; stage?: number; reason?: string }[] = [];

  for (const row of (rows ?? []) as FailedTransactionRow[]) {
    const minutesSince = (now.getTime() - new Date(row.created_at).getTime()) / (60 * 1000);
    const stage = applicableStage(minutesSince);
    if (stage === undefined) continue;

    const alreadySent = row.failure_reminder_stage !== null && row.failure_reminder_stage >= stage;
    if (alreadySent) continue;

    // Déjà résolu entre-temps (un paiement ultérieur a réussi) — on arrête la séquence sans email.
    const { data: restricted } = await admin
      .from("profile_restricted")
      .select("subscription_status")
      .eq("id", row.user_id)
      .maybeSingle();

    if (restricted?.subscription_status === "ACTIVE") {
      await admin.from("transactions").update({ failure_reminder_stage: stage }).eq("id", row.id);
      results.push({ transactionId: row.id, sent: false, stage, reason: "Déjà abonné depuis" });
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
      await sendFailedPaymentReminderEmail(email, profile?.first_name ?? "Membre", planLabel, stage);
      await admin.from("transactions").update({ failure_reminder_stage: stage }).eq("id", row.id);
      results.push({ transactionId: row.id, sent: true, stage });
    } catch (err) {
      results.push({ transactionId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(JSON.stringify({ reminders: results }), {
    headers: { "Content-Type": "application/json" }
  });
});
