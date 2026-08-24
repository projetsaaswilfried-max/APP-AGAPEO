"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdminSession, requireAdminSession, requireStaffSession } from "@/lib/supabase/session";
import { logAdminAction } from "@/lib/audit-log";
import { sendVerificationEmail } from "@/lib/verification-emails";
import { sendPremiumRemovedEmail } from "@/lib/premium-emails";
import { sendRoleChangedEmail } from "@/lib/role-emails";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/lib/youtube";
import { PREMIUM_PLANS, type PremiumPlanKey } from "@/domain/premium-plans";
import { z } from "zod";

const OfficialPostSchema = z.object({
  title: z.string().trim().max(140).optional(),
  content: z.string().trim().min(3).max(3000),
  category: z.enum(["TEACHING", "TESTIMONY", "WORKSHOP", "ADVICE", "ANNOUNCEMENT", "QUOTE", "VERSE", "NEWS"]),
  mediaKind: z.enum(["IMAGE", "VIDEO", "YOUTUBE"]).optional(),
  mediaUrl: z.string().url().optional(),
  mediaStoragePath: z.string().optional()
});

/**
 * Publication officielle : réservée à ADMIN/SUPER_ADMIN (pas MODERATOR, dont
 * le périmètre est la modération — signalements, support, vérifications).
 * La RLS (`posts_insert`) autorise en réalité aussi MODERATOR, mais cette
 * action ne l'expose qu'à ADMIN+ : la page `/admin/posts` elle-même est
 * gated pareil, MODERATOR ne peut donc jamais l'atteindre via l'UI.
 */
export async function createOfficialPostAction(input: unknown) {
  const parsed = OfficialPostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const { user } = await requireAdminSession();
  const supabase = await createClient();

  const isVideo = parsed.data.mediaKind === "VIDEO" && Boolean(parsed.data.mediaUrl);
  const isImage = parsed.data.mediaKind === "IMAGE" && Boolean(parsed.data.mediaUrl);

  // Ré-extraction côté serveur, jamais confiance dans l'ID déjà résolu côté
  // client — mediaUrl transporte le lien YouTube complet pour passer la
  // validation .url(), video_url en base ne stocke que l'identifiant.
  const youtubeVideoId =
    parsed.data.mediaKind === "YOUTUBE" && parsed.data.mediaUrl ? extractYouTubeVideoId(parsed.data.mediaUrl) : null;
  if (parsed.data.mediaKind === "YOUTUBE" && parsed.data.mediaUrl && !youtubeVideoId) {
    return { error: "Lien YouTube invalide." };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      post_type: "OFFICIAL",
      category: parsed.data.category,
      title: parsed.data.title || null,
      content: parsed.data.content,
      media_type: isVideo ? "VIDEO" : isImage ? "IMAGE" : youtubeVideoId ? "YOUTUBE" : "TEXT_ONLY",
      video_url: isVideo ? parsed.data.mediaUrl : youtubeVideoId,
      video_thumbnail: youtubeVideoId ? getYouTubeThumbnailUrl(youtubeVideoId) : null
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

const UpdateOfficialPostSchema = OfficialPostSchema.extend({
  postId: z.string().uuid(),
  removeMedia: z.boolean().optional()
});

/**
 * Modification d'une publication officielle existante — réservée à ADMIN/
 * SUPER_ADMIN, même périmètre que la création. Si `mediaKind`/`mediaUrl`
 * sont absents et `removeMedia` est faux, le média existant n'est pas
 * touché (édition texte seule).
 */
export async function updateOfficialPostAction(input: unknown) {
  const parsed = UpdateOfficialPostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  await requireAdminSession();
  const supabase = await createClient();

  const { postId, title, content, category, mediaKind, mediaUrl, mediaStoragePath, removeMedia } = parsed.data;

  const isVideo = mediaKind === "VIDEO" && Boolean(mediaUrl);
  const isImage = mediaKind === "IMAGE" && Boolean(mediaUrl);

  const youtubeVideoId = mediaKind === "YOUTUBE" && mediaUrl ? extractYouTubeVideoId(mediaUrl) : null;
  if (mediaKind === "YOUTUBE" && mediaUrl && !youtubeVideoId) {
    return { error: "Lien YouTube invalide." };
  }

  const updatePayload: Record<string, unknown> = { title: title || null, content, category };

  const mediaChanged = isVideo || isImage || Boolean(youtubeVideoId) || removeMedia;
  if (isVideo || isImage || youtubeVideoId) {
    updatePayload.media_type = isVideo ? "VIDEO" : isImage ? "IMAGE" : "YOUTUBE";
    updatePayload.video_url = isVideo ? mediaUrl : youtubeVideoId;
    updatePayload.video_thumbnail = youtubeVideoId ? getYouTubeThumbnailUrl(youtubeVideoId) : null;
  } else if (removeMedia) {
    updatePayload.media_type = "TEXT_ONLY";
    updatePayload.video_url = null;
    updatePayload.video_thumbnail = null;
  }

  const { error } = await supabase.from("posts").update(updatePayload).eq("id", postId).eq("post_type", "OFFICIAL");
  if (error) return { error: error.message };

  if (mediaChanged) {
    await supabase.from("post_media").delete().eq("post_id", postId);
  }
  if (isImage && mediaUrl && mediaStoragePath) {
    await supabase.from("post_media").insert({ post_id: postId, url: mediaUrl, storage_path: mediaStoragePath, position: 0 });
  }

  revalidatePath("/");
  revalidatePath("/admin/posts");
  return { success: true };
}

export async function deleteOfficialPostAction(postId: string) {
  await requireAdminSession();
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
 * seule barrière de sécurité est donc le `require*Session()` de chaque
 * action, revérifié à chaque appel plutôt que délégué à l'UI. Changer le
 * rôle de quelqu'un reste réservé à SUPER_ADMIN (jamais délégué, pour éviter
 * qu'un ADMIN/MODERATOR ne s'auto-promeuve ou promeuve un tiers).
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

  const { data: target } = await admin.from("profiles").select("first_name").eq("id", userId).maybeSingle();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  if (target && authUser?.user?.email) {
    await sendRoleChangedEmail(authUser.user.email, target.first_name, role);
  }

  return { success: true };
}

/**
 * `profile_restricted.is_suspended` n'était affiché que par la page (dashboard) —
 * elle ne coupait rien côté API : une session déjà valide continuait de
 * fonctionner pour envoyer des messages, publier, etc. via un appel direct.
 * On bannit désormais aussi la session au niveau Supabase Auth
 * (`ban_duration`), qui invalide le compte pour de vrai, pas seulement
 * visuellement — plutôt que de retoucher une à une toutes les policies RLS.
 */
export async function toggleSuspendUserAction(userId: string, suspend: boolean, reason?: string) {
  const { user } = await requireAdminSession();
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

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? "876000h" : "none"
  });
  if (banError) return { error: banError.message };

  await logAdminAction(user.id, suspend ? "SUSPEND_USER" : "UNSUSPEND_USER", { targetType: "profile", targetId: userId, details: { reason } });
  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Accorde ou retire manuellement l'accès Premium depuis l'espace admin (ex :
 * geste commercial, remboursement, test). N'écrit jamais dans `transactions`
 * — aucun paiement réel n'a eu lieu, ce serait fabriquer une preuve de vente.
 * `plan` (mensuel/trimestriel) fixe la durée accordée et la valeur écrite
 * dans `subscription_plan` — la même que pour un achat réel via Chariow, un
 * octroi admin est donc indiscernable ensuite d'un vrai abonnement du même
 * plan (colonne "Premium" de l'espace admin, emails de relance, etc.).
 */
export async function toggleUserPremiumAction(userId: string, grant: boolean, plan?: PremiumPlanKey) {
  const { user } = await requireAdminSession();
  if (userId === user.id) return { error: "Impossible de modifier ton propre abonnement depuis cet espace." };

  const admin = createAdminClient();
  const planConfig = PREMIUM_PLANS[plan ?? "MONTHLY"];
  const { error } = await admin
    .from("profile_restricted")
    .update(
      grant
        ? {
            subscription_status: "ACTIVE",
            subscription_plan: planConfig.dbValue,
            subscription_current_period_end: new Date(Date.now() + planConfig.periodDays * 24 * 60 * 60 * 1000).toISOString()
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
  const { user } = await requireStaffSession();
  const admin = createAdminClient();

  const { error: profileError } = await admin.from("profiles").update({ photo_verification_status: "VERIFIED" }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  const { error: requestError } = await admin
    .from("verification_requests")
    .update({ status: "VERIFIED", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq("id", requestId);
  if (requestError) return { error: requestError.message };

  // Repart de zéro pour la séquence email "passe Premium" (cf. migration
  // activation_email_sequences) — utile si ce membre avait déjà été vérifié
  // puis avait perdu son statut (photo supprimée) : une nouvelle validation
  // doit relancer le cycle de J1 à J7, pas reprendre un ancien palier.
  await admin.from("profile_restricted").update({ premium_sequence_stage: null }).eq("id", userId);

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
  const { user } = await requireStaffSession();
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
  const { user } = await requireStaffSession();
  if (!REPORT_STATUSES.includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) return { error: error.message };

  await logAdminAction(user.id, "UPDATE_REPORT_STATUS", { targetType: "report", targetId: reportId, details: { status } });
  revalidatePath("/admin/reports");
  return { success: true };
}
