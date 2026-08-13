"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";
import { isProfileComplete } from "@/domain/profile-completeness";
import type { ProfileRow } from "@/lib/supabase/database.types";

/**
 * Soumission d'une demande de vérification par le membre lui-même.
 *
 * `profiles.photo_verification_status` est protégé par le trigger
 * `protect_privileged_profile_columns()` — même le propriétaire de la ligne
 * ne peut pas le faire passer à PENDING via le client authentifié normal.
 * Cette action insère donc le dossier via le client authentifié (RLS :
 * user_id = auth.uid() suffit), puis bascule le badge public via le client
 * service_role pour ce seul champ — même pattern que `deleteAccountAction`.
 */
export async function submitVerificationRequestAction() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expirée, reconnecte-toi." };

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = profileData as ProfileRow | null;
  if (!profile) return { error: "Profil introuvable." };

  if (!isProfileComplete(profile)) {
    return { error: "Complète d'abord ton profil (photo, confession, vision du mariage) avant de soumettre pour vérification." };
  }
  if (profile.photo_verification_status === "PENDING") {
    return { error: "Une demande est déjà en cours de traitement." };
  }
  if (profile.photo_verification_status === "VERIFIED") {
    return { error: "Ton profil est déjà vérifié." };
  }

  const { data: restricted } = await supabase.from("profile_restricted").select("subscription_status").eq("id", user.id).single();
  const isPriority = restricted?.subscription_status === "ACTIVE";

  const { error: insertError } = await supabase.from("verification_requests").insert({ user_id: user.id, is_priority: isPriority });
  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "Une demande est déjà en cours de traitement." };
    }
    return { error: insertError.message };
  }

  const admin = createAdminClient();
  const { error: statusError } = await admin.from("profiles").update({ photo_verification_status: "PENDING" }).eq("id", user.id);
  if (statusError) return { error: statusError.message };

  await sendVerificationEmail({
    to: user.email!,
    firstName: profile.first_name,
    kind: "SUBMITTED",
    isPriority
  });

  revalidatePath("/profile");
  return { success: true };
}

type VerificationEmailKind = "SUBMITTED" | "APPROVED" | "REJECTED";

interface SendVerificationEmailInput {
  to: string;
  firstName: string;
  kind: VerificationEmailKind;
  isPriority?: boolean;
  rejectionReason?: string;
}

/** Utilisée à la fois par la soumission (membre) et par la décision admin (approve/reject). */
export async function sendVerificationEmail({ to, firstName, kind, isPriority, rejectionReason }: SendVerificationEmailInput) {
  const delay = isPriority ? "moins de 24h" : "généralement 48h";

  const configs: Record<VerificationEmailKind, { subject: string; headline: string; contentHtml: string; ctaText: string }> = {
    SUBMITTED: {
      subject: "Ton profil est en cours de vérification — Agapeo",
      headline: "Profil soumis avec succès",
      contentHtml: `<p style="margin:0 0 12px 0;">Ton profil a bien été soumis pour vérification. Notre équipe l'examine et revient vers toi sous <strong>${delay}</strong>.</p><p style="margin:0;color:#94A3B8;font-size:12px;">Tant que la vérification est en cours, ton profil n'est pas encore proposé aux autres membres dans Découvrir.</p>`,
      ctaText: "Voir mon profil"
    },
    APPROVED: {
      subject: "Ton profil est vérifié ! — Agapeo",
      headline: "Profil vérifié ✓",
      contentHtml: `<p style="margin:0;">Bonne nouvelle : ton profil a été vérifié par notre équipe. Le badge de vérification est maintenant visible sur ton profil, et tu es désormais proposé(e) aux autres membres dans Découvrir.</p>`,
      ctaText: "Aller sur Agapeo"
    },
    REJECTED: {
      subject: "Ton profil n'a pas pu être vérifié — Agapeo",
      headline: "Vérification non validée",
      contentHtml: `<p style="margin:0 0 12px 0;">Notre équipe n'a pas pu valider ton profil pour la raison suivante :</p><div style="background:#F4F6F8;border-radius:12px;padding:14px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-line;">${rejectionReason ?? "Raison non précisée."}</div><p style="margin:12px 0 0 0;">Corrige ce point puis soumets à nouveau ton profil depuis ton compte — on est là pour t'aider si besoin via le support.</p>`,
      ctaText: "Corriger mon profil"
    }
  };

  const cfg = configs[kind];

  try {
    const apiKey = getResendApiKey();
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Agapeo <support@agapeo.love>",
        to: [to],
        subject: cfg.subject,
        html: buildAgapeoEmailHtml({
          title: cfg.subject,
          eyebrow: "VÉRIFICATION",
          headline: cfg.headline,
          recipientFirstName: firstName,
          contentHtml: cfg.contentHtml,
          ctaText: cfg.ctaText,
          ctaUrl: `${env.siteUrl}/profile`
        })
      })
    });
  } catch {
    // Best-effort : le statut en base (source de vérité) est déjà à jour
    // que l'email parte ou non, on ne fait jamais échouer l'action pour ça.
  }
}
