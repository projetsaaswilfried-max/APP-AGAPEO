"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import { sendVerificationEmail } from "@/lib/actions/verification.actions";
import { sendPremiumRemovedEmail } from "@/lib/premium-emails";
import { z } from "zod";

const OfficialPostSchema = z.object({
  title: z.string().trim().max(140).optional(),
  content: z.string().trim().min(3).max(3000),
  category: z.enum(["TEACHING", "TESTIMONY", "ADVICE", "ANNOUNCEMENT", "QUOTE", "VERSE", "NEWS"]),
  mediaKind: z.enum(["IMAGE", "VIDEO"]).optional(),
  mediaUrl: z.string().url().optional(),
  mediaStoragePath: z.string().optional()
});

/**
 * Publication officielle : la RLS (`posts_insert`) exige déjà que l'auteur
 * ait le rôle ADMIN/MODERATOR/SUPER_ADMIN — cette action n'est qu'une
 * validation applicative supplémentaire, pas la seule barrière de sécurité.
 */
export async function createOfficialPostAction(input: unknown) {
  const parsed = OfficialPostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée." };

  const isVideo = parsed.data.mediaKind === "VIDEO" && Boolean(parsed.data.mediaUrl);
  const isImage = parsed.data.mediaKind === "IMAGE" && Boolean(parsed.data.mediaUrl);

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      post_type: "OFFICIAL",
      category: parsed.data.category,
      title: parsed.data.title || null,
      content: parsed.data.content,
      media_type: isVideo ? "VIDEO" : isImage ? "IMAGE" : "TEXT_ONLY",
      video_url: isVideo ? parsed.data.mediaUrl : null
    })
    .select()
    .single();

  if (error || !post) return { error: error?.message ?? "La publication a échoué (rôle insuffisant ?)." };

  if (isImage && parsed.data.mediaUrl && parsed.data.mediaStoragePath) {
    await supabase.from("post_media").insert({ post_id: post.id, url: parsed.data.mediaUrl, storage_path: parsed.data.mediaStoragePath, position: 0 });
  }

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { success: true };
}

export async function deleteOfficialPostAction(postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("post_type", "OFFICIAL");
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { success: true };
}

const ASSIGNABLE_ROLES = ["USER", "MODERATOR", "ADMIN"] as const;

/**
 * Mutations d'administration sur `profile_restricted` (rôle, suspension) et
 * `profiles` (vérification photo) : passent par le client service_role car
 * ni l'une ni l'autre table n'a de policy RLS d'écriture pour un tiers
 * (volontaire — cf. migration RLS / lock_down_restricted_profile_fields). La
 * seule barrière de sécurité est donc `requireSuperAdminSession()` ici,
 * revérifiée à chaque appel plutôt que déléguée à l'UI.
 */
export async function updateUserRoleAction(userId: string, role: (typeof ASSIGNABLE_ROLES)[number]) {
  const { user, profile } = await requireSuperAdminSession();
  if (!ASSIGNABLE_ROLES.includes(role)) return { error: "Rôle invalide." };
  if (userId === user.id) return { error: "Impossible de modifier son propre rôle." };
  if (profile.id === userId) return { error: "Impossible de modifier son propre rôle." };

  const admin = createAdminClient();
  const { error } = await admin.from("profile_restricted").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "UPDATE_USER_ROLE", { targetType: "profile", targetId: userId, details: { role } });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleSuspendUserAction(userId: string, suspend: boolean, reason?: string) {
  const { user } = await requireSuperAdminSession();
  if (userId === user.id) return { error: "Impossible de suspendre son propre compte." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profile_restricted")
    .update({
      is_suspended: suspend,
      suspended_at: suspend ? new Date().toISOString() : null,
      suspended_reason: suspend ? reason || null : null
    })
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, suspend ? "SUSPEND_USER" : "UNSUSPEND_USER", { targetType: "profile", targetId: userId, details: { reason } });
  revalidatePath("/admin/users");
  return { success: true };
}

const PREMIUM_GRANT_PLAN = "admin_grant";
const PREMIUM_GRANT_DAYS = 30;

/**
 * Accorde ou retire manuellement l'accès Premium depuis l'espace admin (ex :
 * geste commercial, remboursement, test). N'écrit jamais dans `transactions`
 * — aucun paiement réel n'a eu lieu, ce serait fabriquer une preuve de vente.
 * `subscription_plan = 'admin_grant'` distingue clairement ces octrois des
 * abonnements payés via Chariow (`premium_monthly`) dans l'historique.
 */
export async function toggleUserPremiumAction(userId: string, grant: boolean) {
  const { user } = await requireSuperAdminSession();
  if (userId === user.id) return { error: "Impossible de modifier ton propre abonnement depuis cet espace." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profile_restricted")
    .update(
      grant
        ? {
            subscription_status: "ACTIVE",
            subscription_plan: PREMIUM_GRANT_PLAN,
            subscription_current_period_end: new Date(Date.now() + PREMIUM_GRANT_DAYS * 24 * 60 * 60 * 1000).toISOString()
          }
        : { subscription_status: "FREE", subscription_plan: null, subscription_current_period_end: null }
    )
    .eq("id", userId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, grant ? "GRANT_PREMIUM" : "REVOKE_PREMIUM", { targetType: "profile", targetId: userId });
  revalidatePath("/admin/users");

  if (!grant) {
    const [{ data: memberProfile }, { data: authUser }] = await Promise.all([
      admin.from("profiles").select("first_name").eq("id", userId).maybeSingle(),
      admin.auth.admin.getUserById(userId)
    ]);
    if (memberProfile && authUser?.user?.email) {
      await sendPremiumRemovedEmail(authUser.user.email, memberProfile.first_name, "admin");
    }
  }

  return { success: true };
}

/**
 * Valide une demande de vérification : bascule le badge public (`profiles`),
 * clôt le dossier (`verification_requests`), notifie le membre par email.
 */
export async function approveVerificationRequestAction(requestId: string, userId: string) {
  const { user } = await requireSuperAdminSession();
  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").update({ photo_verification_status: "VERIFIED" }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  const { error: requestError } = await admin
    .from("verification_requests")
    .update({ status: "VERIFIED", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", requestId);
  if (requestError) return { error: requestError.message };

  const { data: target } = await admin.from("profiles").select("first_name").eq("id", userId).single();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (target && authUser?.user?.email) {
    await sendVerificationEmail({ to: authUser.user.email, firstName: target.first_name, kind: "APPROVED" });
  }

  await logAdminAction(user.id, "APPROVE_VERIFICATION", { targetType: "profile", targetId: userId, details: { requestId } });
  revalidatePath("/admin/verifications");
  return { success: true };
}

/** Refuse une demande de vérification : la raison est obligatoire et envoyée telle quelle au membre. */
export async function rejectVerificationRequestAction(requestId: string, userId: string, reason: string) {
  const { user } = await requireSuperAdminSession();
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "Le motif du refus est obligatoire." };

  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").update({ photo_verification_status: "REJECTED" }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  const { error: requestError } = await admin
    .from("verification_requests")
    .update({ status: "REJECTED", reviewed_at: new Date().toISOString(), reviewed_by: user.id, rejection_reason: trimmedReason })
    .eq("id", requestId);
  if (requestError) return { error: requestError.message };

  const { data: target } = await admin.from("profiles").select("first_name").eq("id", userId).single();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (target && authUser?.user?.email) {
    await sendVerificationEmail({ to: authUser.user.email, firstName: target.first_name, kind: "REJECTED", rejectionReason: trimmedReason });
  }

  await logAdminAction(user.id, "REJECT_VERIFICATION", { targetType: "profile", targetId: userId, details: { requestId, reason: trimmedReason } });
  revalidatePath("/admin/verifications");
  return { success: true };
}

const REPORT_STATUSES = ["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN"] as const;

export async function updateReportStatusAction(reportId: string, status: (typeof REPORT_STATUSES)[number]) {
  const { user } = await requireSuperAdminSession();
  if (!REPORT_STATUSES.includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "UPDATE_REPORT_STATUS", { targetType: "report", targetId: reportId, details: { status } });
  revalidatePath("/admin/reports");
  return { success: true };
}
