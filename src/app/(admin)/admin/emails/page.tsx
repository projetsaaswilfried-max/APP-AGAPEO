import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/supabase/session";
import { AdminEmailComposer, type DirectRecipientOption } from "@/components/features/admin/admin-email-composer";
import type { EmailCampaignRow, ProfileRow, ProfileRestrictedRow } from "@/lib/supabase/database.types";
import { isProfileComplete } from "@/domain/profile-completeness";
import type { EmailAudience } from "@/domain/email-audience";

export default async function AdminEmailsPage() {
  await requireAdminSession();
  const admin = createAdminClient();

  const [{ data: profiles }, { data: restricted }, { data: campaigns }] = await Promise.all([
    admin.from("profiles").select("*").eq("is_test_account", false),
    admin.from("profile_restricted").select("id, subscription_status"),
    admin.from("email_campaigns").select("*").order("sent_at", { ascending: false }).limit(30)
  ]);

  const rows = (profiles ?? []) as ProfileRow[];
  const subscriptionById = new Map(
    ((restricted ?? []) as Pick<ProfileRestrictedRow, "id" | "subscription_status">[]).map((r) => [r.id, r.subscription_status])
  );
  const counts: Record<Exclude<EmailAudience, "DIRECT">, number> = {
    ALL: rows.length,
    PREMIUM: rows.filter((p) => subscriptionById.get(p.id) === "ACTIVE").length,
    NO_SUBSCRIPTION: rows.filter((p) => subscriptionById.get(p.id) === "FREE").length,
    VERIFIED: rows.filter((p) => p.photo_verification_status === "VERIFIED").length,
    INCOMPLETE_PROFILE: rows.filter((p) => !isProfileComplete(p)).length
  };

  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
  const directRecipients: DirectRecipientOption[] = rows
    .map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name ?? ""}`.trim(), email: emailById.get(p.id) ?? "" }))
    .filter((r) => Boolean(r.email));

  const senderIds = [...new Set(((campaigns ?? []) as EmailCampaignRow[]).map((c) => c.sender_id).filter((id): id is string => Boolean(id)))];
  const { data: senders } = senderIds.length > 0 ? await admin.from("profiles").select("id, first_name").in("id", senderIds) : { data: [] };
  const senderNameById = new Map((senders ?? []).map((s) => [s.id, s.first_name]));

  const history = ((campaigns ?? []) as EmailCampaignRow[]).map((c) => ({
    id: c.id,
    subject: c.subject,
    audience: c.audience,
    recipientsCount: c.recipients_count,
    failedCount: c.failed_count,
    status: c.status,
    scheduledFor: c.scheduled_for,
    sentAt: c.sent_at,
    senderName: c.sender_id ? senderNameById.get(c.sender_id) ?? "Admin" : "Admin"
  }));

  return <AdminEmailComposer initialCounts={counts} directRecipients={directRecipients} history={history} />;
}
