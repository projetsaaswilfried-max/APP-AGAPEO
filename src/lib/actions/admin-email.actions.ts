"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import { getResendApiKey } from "@/config/env";
import { isProfileComplete } from "@/domain/profile-completeness";
import { applyMergeTags } from "@/domain/email-merge-tags";
import { AUDIENCE_LABELS, type EmailAudience } from "@/domain/email-audience";
import type { ProfileRow } from "@/lib/supabase/database.types";

import { buildAgapeoEmailHtml } from "@/lib/email-template";

async function resolveAudienceProfiles(audience: EmailAudience, directRecipientId?: string): Promise<ProfileRow[]> {
  const admin = createAdminClient();

  if (audience === "DIRECT") {
    if (!directRecipientId) return [];
    const { data } = await admin.from("profiles").select("*").eq("id", directRecipientId).single();
    return data ? [data as ProfileRow] : [];
  }

  const { data: profiles } = await admin.from("profiles").select("*").eq("is_test_account", false);
  let rows = (profiles ?? []) as ProfileRow[];

  if (audience === "PREMIUM" || audience === "NO_SUBSCRIPTION") {
    const status = audience === "PREMIUM" ? "ACTIVE" : "FREE";
    const { data: restricted } = await admin.from("profile_restricted").select("id").eq("subscription_status", status);
    const allowedIds = new Set((restricted ?? []).map((r) => r.id));
    rows = rows.filter((p) => allowedIds.has(p.id));
  }
  if (audience === "VERIFIED") rows = rows.filter((p) => p.photo_verification_status === "VERIFIED");
  if (audience === "INCOMPLETE_PROFILE") rows = rows.filter((p) => !isProfileComplete(p));

  return rows;
}

export async function getAudienceCountAction(audience: EmailAudience, directRecipientId?: string) {
  await requireAdminSession();
  const rows = await resolveAudienceProfiles(audience, directRecipientId);
  return { count: rows.length };
}

function renderCampaignEmailHtml(firstName: string, subject: string, bodyHtmlTemplate: string, siteUrl: string) {
  const personalizedBody = applyMergeTags(bodyHtmlTemplate, firstName);
  const personalizedSubject = applyMergeTags(subject, firstName);

  return buildAgapeoEmailHtml({
    title: "Communication AGAPEO",
    preheader: "Message important de l'équipe AGAPEO",
    eyebrow: "AGAPEO",
    headline: personalizedSubject,
    recipientFirstName: firstName,
    contentHtml: personalizedBody,
    ctaText: "Ouvrir l'application AGAPEO",
    ctaUrl: siteUrl
  });
}

interface Recipient {
  email: string;
  firstName: string;
}

async function sendBatch(recipients: Recipient[], subject: string, bodyHtmlTemplate: string, siteUrl: string): Promise<{ sent: number; failed: number }> {
  const apiKey = getResendApiKey();
  const CHUNK_SIZE = 100;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
    const chunk = recipients.slice(i, i + CHUNK_SIZE);
    const payload = chunk.map((r) => ({
      from: "Agapeo <support@agapeo.love>",
      to: [r.email],
      subject: applyMergeTags(subject, r.firstName),
      html: renderCampaignEmailHtml(r.firstName, subject, bodyHtmlTemplate, siteUrl)
    }));

    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      sent += chunk.length;
    } else {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}

export async function sendEmailCampaignAction(input: {
  subject: string;
  bodyHtml: string;
  audience: EmailAudience;
  directRecipientId?: string;
  scheduledFor?: string;
}) {
  const { user } = await requireAdminSession();

  const subject = input.subject.trim();
  const bodyHtml = input.bodyHtml.trim();
  const plainTextLength = bodyHtml.replace(/<[^>]*>/g, "").trim().length;
  if (!subject || subject.length > 200) return { error: "Objet invalide (1 à 200 caractères)." };
  if (!bodyHtml || plainTextLength === 0) return { error: "Le message ne peut pas être vide." };
  if (bodyHtml.length > 50000) return { error: "Le message est trop long." };
  if (input.audience === "DIRECT" && !input.directRecipientId) return { error: "Choisis un destinataire précis." };

  const admin = createAdminClient();

  const scheduledDate = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const isFutureSchedule = scheduledDate && scheduledDate.getTime() > Date.now() + 60_000;

  if (isFutureSchedule) {
    // On vérifie juste qu'il existe au moins un destinataire au moment de la
    // programmation — la liste réelle sera recalculée à l'envoi (le segment
    // peut évoluer entre temps, ex: nouveaux inscrits).
    const profiles = await resolveAudienceProfiles(input.audience, input.directRecipientId);
    if (profiles.length === 0) {
      return { error: `Aucun destinataire dans "${AUDIENCE_LABELS[input.audience]}" pour le moment.` };
    }

    const { error } = await admin.from("email_campaigns").insert({
      sender_id: user.id,
      subject,
      body_html: bodyHtml,
      audience: input.audience,
      direct_recipient_id: input.audience === "DIRECT" ? input.directRecipientId : null,
      status: "SCHEDULED",
      scheduled_for: scheduledDate!.toISOString(),
      recipients_count: 0,
      failed_count: 0
    });
    if (error) return { error: error.message };

    await logAdminAction(user.id, "SCHEDULE_EMAIL_CAMPAIGN", {
      targetType: "email_campaign",
      details: { subject, audience: input.audience, scheduledFor: scheduledDate!.toISOString() }
    });
    revalidatePath("/admin/emails");
    return { success: true, scheduled: true, scheduledFor: scheduledDate!.toISOString() };
  }

  const profiles = await resolveAudienceProfiles(input.audience, input.directRecipientId);
  if (profiles.length === 0) {
    return { error: `Aucun destinataire dans "${AUDIENCE_LABELS[input.audience]}" pour le moment.` };
  }

  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  const recipients: Recipient[] = profiles
    .map((p) => ({ email: emailById.get(p.id) ?? "", firstName: p.first_name }))
    .filter((r) => Boolean(r.email));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { sent, failed } = await sendBatch(recipients, subject, bodyHtml, siteUrl);

  await admin.from("email_campaigns").insert({
    sender_id: user.id,
    subject,
    body_html: bodyHtml,
    audience: input.audience,
    direct_recipient_id: input.audience === "DIRECT" ? input.directRecipientId : null,
    status: "SENT",
    recipients_count: sent,
    failed_count: failed
  });

  await logAdminAction(user.id, "SEND_EMAIL_CAMPAIGN", {
    targetType: "email_campaign",
    details: { subject, audience: input.audience, sent, failed }
  });
  revalidatePath("/admin/emails");
  return { success: true, sent, failed, total: recipients.length };
}

export async function cancelScheduledCampaignAction(campaignId: string) {
  const { user } = await requireAdminSession();
  const admin = createAdminClient();

  const { error } = await admin.from("email_campaigns").update({ status: "CANCELED" }).eq("id", campaignId).eq("status", "SCHEDULED");
  if (error) return { error: error.message };

  await logAdminAction(user.id, "CANCEL_EMAIL_CAMPAIGN", { targetType: "email_campaign", targetId: campaignId });
  revalidatePath("/admin/emails");
  return { success: true };
}
