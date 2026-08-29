// Envoie les campagnes email programmées (email_campaigns.status = 'SCHEDULED'
// et scheduled_for <= now()). Déclenché par pg_cron toutes les 5 minutes
// (cf. migration 20260808210000_schedule_campaign_cron.sql).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAgapeoEmailHtml } from "../_shared/email-template.ts";
import { requireServiceRole } from "../_shared/auth-guard.ts";

interface ProfileRow {
  id: string;
  first_name: string;
  gender: string | null;
  birth_date: string | null;
  country: string | null;
  avatar_url: string | null;
  church_denomination: string | null;
  why_marriage: string | null;
  photo_verification_status: string;
  is_test_account: boolean;
}

interface EmailCampaignRow {
  id: string;
  subject: string;
  body_html: string;
  audience: string;
  direct_recipient_id: string | null;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const DIGEST_FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "Agapeo <support@agapeo.love>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

function applyMergeTags(html: string, firstName: string): string {
  return html.replaceAll("{{prenom}}", firstName).replaceAll("{{Prenom}}", firstName).replaceAll("{{PRENOM}}", firstName.toUpperCase());
}

// Doit rester synchronisée avec src/domain/profile-completeness.ts (Deno ne
// peut pas importer ce module Next.js) : un ancien bug (déjà corrigé) a
// laissé de vrais comptes VERIFIED sans genre/date de naissance/pays,
// invisibles dans Découvrir — inclure ces 3 champs ici aussi pour que le
// public réel d'une campagne "profil incomplet" corresponde à ce que
// l'aperçu de l'espace admin affiche.
function isProfileComplete(p: ProfileRow): boolean {
  return Boolean(p.avatar_url && p.church_denomination && p.why_marriage && p.gender && p.birth_date && p.country);
}

function renderCampaignEmailHtml(firstName: string, subject: string, bodyHtmlTemplate: string) {
  const personalizedBody = applyMergeTags(bodyHtmlTemplate, firstName);
  const personalizedSubject = applyMergeTags(subject, firstName);
  return buildAgapeoEmailHtml({
    title: "Communication Agapeo",
    preheader: "Message de l'équipe Agapeo",
    eyebrow: "AGAPEO",
    headline: personalizedSubject,
    recipientFirstName: firstName,
    contentHtml: personalizedBody,
    ctaText: "Ouvrir Agapeo",
    ctaUrl: SITE_URL
  });
}

async function resolveAudienceProfiles(admin: ReturnType<typeof createClient>, audience: string, directRecipientId: string | null): Promise<ProfileRow[]> {
  if (audience === "DIRECT") {
    if (!directRecipientId) return [];
    const { data } = await admin.from("profiles").select("*").eq("id", directRecipientId).single();
    return data ? [data as ProfileRow] : [];
  }

  const { data } = await admin.from("profiles").select("*").eq("is_test_account", false);
  let rows = (data ?? []) as ProfileRow[];

  if (audience === "PREMIUM" || audience === "NO_SUBSCRIPTION") {
    const status = audience === "PREMIUM" ? "ACTIVE" : "FREE";
    const { data: restricted } = await admin.from("profile_restricted").select("id").eq("subscription_status", status);
    const allowedIds = new Set((restricted ?? []).map((r: { id: string }) => r.id));
    rows = rows.filter((p) => allowedIds.has(p.id));
  }
  if (audience === "VERIFIED") rows = rows.filter((p) => p.photo_verification_status === "VERIFIED");
  if (audience === "INCOMPLETE_PROFILE") rows = rows.filter((p) => !isProfileComplete(p));

  return rows;
}

async function sendBatch(admin: ReturnType<typeof createClient>, recipients: { email: string; firstName: string }[], subject: string, bodyHtmlTemplate: string) {
  const CHUNK_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const payload = chunk.map((r) => ({
      from: DIGEST_FROM_EMAIL,
      to: [r.email],
      subject: applyMergeTags(subject, r.firstName),
      html: renderCampaignEmailHtml(r.firstName, subject, bodyHtmlTemplate)
    }));

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) sent += chunk.length;
    else failed += chunk.length;
  }

  return { sent, failed };
}

Deno.serve(async (req) => {
  const unauthorized = requireServiceRole(req);
  if (unauthorized) return unauthorized;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: campaigns, error } = await admin
    .from("email_campaigns")
    .select("*")
    .eq("status", "SCHEDULED")
    .lte("scheduled_for", new Date().toISOString());

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const results: { campaignId: string; sent: number; failed: number }[] = [];

  for (const campaign of (campaigns ?? []) as EmailCampaignRow[]) {
    const profiles = await resolveAudienceProfiles(admin, campaign.audience, campaign.direct_recipient_id);

    if (profiles.length === 0) {
      await admin.from("email_campaigns").update({ status: "FAILED" }).eq("id", campaign.id);
      results.push({ campaignId: campaign.id, sent: 0, failed: 0 });
      continue;
    }

    const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
    const recipients = profiles.map((p) => ({ email: emailById.get(p.id) ?? "", firstName: p.first_name })).filter((r) => r.email);

    const { sent, failed } = await sendBatch(admin, recipients, campaign.subject, campaign.body_html);

    await admin
      .from("email_campaigns")
      .update({ status: "SENT", recipients_count: sent, failed_count: failed })
      .eq("id", campaign.id);

    results.push({ campaignId: campaign.id, sent, failed });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { "Content-Type": "application/json" } });
});
