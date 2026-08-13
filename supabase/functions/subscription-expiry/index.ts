// Cron quotidien : repasse en EXPIRED les abonnements Premium dont la
// période payée (subscription_current_period_end) est dépassée, et relance
// par email les membres à 3 jours de l'échéance (une seule fois par période,
// cf. subscription_reminder_sent_at, remis à zéro par le webhook Chariow à
// chaque renouvellement réussi). Chariow n'a pas de facturation récurrente —
// c'est cette fonction qui simule la fin d'un cycle d'abonnement.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
const REMINDER_WINDOW_DAYS = 3;

interface ProfileRestrictedRow {
  id: string;
  subscription_status: string;
  subscription_current_period_end: string | null;
}

async function sendReminderEmail(to: string, firstName: string, daysLeft: number) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY manquant — email non envoyé.");

  const html = buildAgapeoEmailHtml({
    title: "Ton abonnement Premium expire bientôt",
    preheader: `Il te reste ${daysLeft} jour(s) d'accès Premium`,
    eyebrow: "PREMIUM",
    headline: "Ton accès Premium arrive à échéance",
    recipientFirstName: firstName,
    contentHtml: `
      <p style="margin: 0 0 12px 0;">
        Ton abonnement Premium Agapeo se termine dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. Renouvelle-le dès maintenant
        pour continuer à profiter de tous tes avantages sans interruption.
      </p>
    `,
    ctaText: "Renouveler mon abonnement",
    ctaUrl: `${SITE_URL}/profile`
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "Ton abonnement Premium Agapeo expire bientôt",
      html
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend a refusé l'envoi (${res.status}) : ${body}`);
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const nowIso = new Date().toISOString();
  const reminderThresholdIso = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1) Downgrade des abonnements réellement expirés.
  const { data: expired, error: expiredErr } = await admin
    .from("profile_restricted")
    .update({ subscription_status: "EXPIRED" })
    .eq("subscription_status", "ACTIVE")
    .lt("subscription_current_period_end", nowIso)
    .select("id");

  if (expiredErr) {
    return new Response(JSON.stringify({ error: expiredErr.message }), { status: 500 });
  }

  // 2) Relance des abonnements qui expirent dans la fenêtre, pas déjà relancés.
  const { data: dueForReminder, error: reminderErr } = await admin
    .from("profile_restricted")
    .select("id, subscription_status, subscription_current_period_end")
    .eq("subscription_status", "ACTIVE")
    .lte("subscription_current_period_end", reminderThresholdIso)
    .gt("subscription_current_period_end", nowIso)
    .is("subscription_reminder_sent_at", null);

  if (reminderErr) {
    return new Response(JSON.stringify({ error: reminderErr.message }), { status: 500 });
  }

  const reminderResults: { userId: string; sent: boolean; reason?: string }[] = [];

  for (const row of (dueForReminder ?? []) as ProfileRestrictedRow[]) {
    const { data: profile } = await admin.from("profiles").select("first_name").eq("id", row.id).single();
    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;

    if (!email || !row.subscription_current_period_end) {
      reminderResults.push({ userId: row.id, sent: false, reason: "Email ou date d'expiration introuvable" });
      continue;
    }

    const daysLeft = Math.max(1, Math.ceil((new Date(row.subscription_current_period_end).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

    try {
      await sendReminderEmail(email, profile?.first_name ?? "Membre", daysLeft);
      await admin.from("profile_restricted").update({ subscription_reminder_sent_at: nowIso }).eq("id", row.id);
      reminderResults.push({ userId: row.id, sent: true });
    } catch (err) {
      reminderResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(
    JSON.stringify({
      expiredCount: (expired ?? []).length,
      reminders: reminderResults
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
