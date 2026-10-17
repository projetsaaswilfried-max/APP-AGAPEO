// Cron toutes les 15 minutes : gère l'essai Premium gratuit de 24h accordé à
// la première validation de profil (cf. approveVerificationRequestAction) —
//   1) Repasse en FREE (jamais EXPIRED, réservé à un vrai abonnement payant
//      qui n'a pas été renouvelé) les essais dont les 24h sont écoulées.
//   2) Relance à 10h écoulées (reste 14h) puis à 22h écoulées (reste 2h, avec
//      incitation à passer Premium) — un seul envoi par palier, par canal
//      (email + message Agapeo dans la messagerie), suivi via
//      trial_reminder_stage. `trial_granted_at` n'est JAMAIS remis à null ici
//      (ni par le downgrade) : c'est le marqueur permanent "essai déjà
//      consommé", cf. migration trial_access_columns.
// Comptes de test (is_test_account) toujours exclus, comme les autres crons.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

// Compte réel `profiles` (is_staff) servant d'expéditeur aux messages
// automatiques Agapeo — même UUID que src/domain/system-account.ts, dupliqué
// en dur ici car les Edge Functions Deno ne résolvent pas les alias "@/...".
const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";

// Index = palier. 0 = 10h écoulées (reste 14h), 1 = 22h écoulées (reste 2h).
const MILESTONES_HOURS = [10, 22];

interface TrialRow {
  id: string;
  first_name: string;
  trial_granted_at: string;
  trial_reminder_stage: number | null;
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

async function sendAgapeoSystemMessage(
  admin: ReturnType<typeof createClient>,
  memberId: string,
  content: string,
  options?: { ctaText?: string; ctaUrl?: string; ctaAction?: string }
): Promise<void> {
  const { data: existingParticipant } = await admin
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(is_system_broadcast)")
    .eq("user_id", memberId)
    .eq("conversations.is_system_broadcast", true)
    .maybeSingle();

  let conversationId: string;
  if (existingParticipant) {
    conversationId = existingParticipant.conversation_id as string;
  } else {
    const { data: newConversation, error: conversationError } = await admin
      .from("conversations")
      .insert({ is_system_broadcast: true, status: "ACCEPTED" })
      .select("id")
      .single();
    if (conversationError || !newConversation) throw new Error(conversationError?.message ?? "Conversation système introuvable.");
    conversationId = newConversation.id;

    const { error: participantsError } = await admin.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: memberId },
      { conversation_id: conversationId, user_id: AGAPEO_SYSTEM_PROFILE_ID }
    ]);
    if (participantsError) throw new Error(participantsError.message);
  }

  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "TEXT",
    content,
    cta_text: options?.ctaText ?? null,
    cta_url: options?.ctaUrl ?? null,
    cta_action: options?.ctaAction ?? null
  });
  if (messageError) throw new Error(messageError.message);

  await admin.from("notifications").insert({
    recipient_id: memberId,
    actor_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "NEW_MESSAGE",
    title: "Agapeo vous a envoyé un message",
    body: content.slice(0, 140),
    target_url: `/messages?conversation=${conversationId}`
  });
}

async function sendTrialReminderEmail(to: string, firstName: string, hoursLeft: 14 | 2) {
  const isUrgent = hoursLeft === 2;
  await sendResendEmail(
    to,
    isUrgent ? "Ton accès Premium gratuit se termine dans 2h" : "Ton accès Premium gratuit se termine dans 14h",
    buildAgapeoEmailHtml({
      title: isUrgent ? "Ton accès Premium gratuit se termine dans 2h" : "Ton accès Premium gratuit se termine dans 14h",
      eyebrow: "ESSAI GRATUIT",
      headline: isUrgent ? "Il te reste 2h d'accès Premium gratuit" : "Il te reste 14h d'accès Premium gratuit",
      recipientFirstName: firstName,
      contentHtml: isUrgent
        ? `
          <p style="margin:0 0 12px 0;">Ton essai Premium gratuit de 24h se termine dans environ 2h. Passé ce délai, tu repasseras en version gratuite : consultation des profils, conversations et favoris redeviennent limités.</p>
          <p style="margin:0;">Pour continuer à profiter de tout Agapeo sans interruption, découvre nos formules Premium dès maintenant.</p>
        `
        : `
          <p style="margin:0 0 12px 0;">Ton essai Premium gratuit de 24h se termine dans environ 14h. D'ici là, profite de tout ce qu'Agapeo a à offrir : consulte les profils en entier, démarre des conversations, vois qui s'intéresse à toi.</p>
          <p style="margin:0;">Tu pourras aussi passer Premium à tout moment pour garder ces avantages après l'essai.</p>
        `,
      ctaText: isUrgent ? "Voir les offres Premium" : "Explorer Agapeo",
      ctaUrl: isUrgent ? `${SITE_URL}/premium` : `${SITE_URL}/discover`
    })
  );
}

function applicableStage(hoursSince: number): number | undefined {
  for (let i = MILESTONES_HOURS.length - 1; i >= 0; i--) {
    if (hoursSince >= MILESTONES_HOURS[i]) return i;
  }
  return undefined;
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const nowIso = now.toISOString();

  // 1) Fin d'essai : repasse en FREE (jamais EXPIRED) les essais dont les 24h sont dépassées.
  const { data: ended, error: endedErr } = await admin
    .from("profile_restricted")
    .update({
      subscription_status: "FREE",
      subscription_plan: null,
      subscription_current_period_end: null
    })
    .eq("subscription_plan", "FREE_TRIAL")
    .lt("subscription_current_period_end", nowIso)
    .select("id");

  if (endedErr) {
    return new Response(JSON.stringify({ error: endedErr.message }), { status: 500 });
  }

  // 2) Relances à 10h puis 22h écoulées depuis trial_granted_at — un seul envoi par palier et par canal.
  const { data: dueRows, error: dueErr } = await admin
    .from("profiles")
    .select("id, first_name, profile_restricted!inner(trial_granted_at, trial_reminder_stage)")
    .eq("profile_restricted.subscription_plan", "FREE_TRIAL")
    .eq("is_test_account", false);

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), { status: 500 });
  }

  const reminderResults: { userId: string; sent: boolean; stage?: number; reason?: string }[] = [];

  for (const row of (dueRows ?? []) as unknown as {
    id: string;
    first_name: string;
    profile_restricted: { trial_granted_at: string; trial_reminder_stage: number | null };
  }[]) {
    const hoursSince = (now.getTime() - new Date(row.profile_restricted.trial_granted_at).getTime()) / (60 * 60 * 1000);
    const stage = applicableStage(hoursSince);
    if (stage === undefined) continue;

    const alreadySent = row.profile_restricted.trial_reminder_stage !== null && row.profile_restricted.trial_reminder_stage >= stage;
    if (alreadySent) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(row.id);
    const email = authUser?.user?.email;
    if (!email) {
      reminderResults.push({ userId: row.id, sent: false, reason: "Email introuvable" });
      continue;
    }

    const hoursLeft = stage === 0 ? 14 : 2;
    try {
      await sendTrialReminderEmail(email, row.first_name, hoursLeft);
      await sendAgapeoSystemMessage(
        admin,
        row.id,
        hoursLeft === 2
          ? "Ton essai Premium gratuit de 24h se termine dans environ 2h. Passé ce délai, tu repasseras en version gratuite. Passe Premium dès maintenant pour continuer à profiter de tout Agapeo sans interruption."
          : "Ton essai Premium gratuit de 24h se termine dans environ 14h. Profite de ce temps pour explorer Agapeo pleinement : consulte les profils, démarre des conversations, découvre qui s'intéresse à toi.",
        { ctaText: hoursLeft === 2 ? "Voir les offres Premium" : "Explorer Agapeo", ctaUrl: hoursLeft === 2 ? "/premium" : "/discover", ctaAction: "PREMIUM" }
      );
      await admin.from("profile_restricted").update({ trial_reminder_stage: stage }).eq("id", row.id);
      reminderResults.push({ userId: row.id, sent: true, stage });
    } catch (err) {
      reminderResults.push({ userId: row.id, sent: false, reason: err instanceof Error ? err.message : "Erreur d'envoi" });
    }
  }

  return new Response(
    JSON.stringify({
      endedCount: (ended ?? []).length,
      reminders: reminderResults
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
