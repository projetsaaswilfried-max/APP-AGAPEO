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
 * `selfieStoragePath` est obligatoire : un selfie pris en direct (caméra,
 * jamais un fichier importé — cf. `SelfieCaptureModal`) que l'équipe compare
 * aux photos déjà postées avant de valider. Sans ça, n'importe qui pouvait
 * poster les photos de quelqu'un d'autre (influenceur, photo trouvée en
 * ligne) et se faire "vérifier" sans jamais montrer son vrai visage.
 *
 * `profiles.photo_verification_status` est protégé par le trigger
 * `protect_privileged_profile_columns()` — même le propriétaire de la ligne
 * ne peut pas le faire passer à PENDING via le client authentifié normal.
 * Cette action insère donc le dossier via le client authentifié (RLS :
 * user_id = auth.uid() suffit), puis bascule le badge public via le client
 * service_role pour ce seul champ — même pattern que `deleteAccountAction`.
 */
export async function submitVerificationRequestAction(selfieStoragePath: string) {
  if (!selfieStoragePath) return { error: "Le selfie de vérification est obligatoire." };

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

  const { error: insertError } = await supabase
    .from("verification_requests")
    .insert({ user_id: user.id, is_priority: isPriority, selfie_storage_path: selfieStoragePath });
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

  const configs: Record<VerificationEmailKind, { subject: string; headline: string; contentHtml: string; ctaText: string; ctaUrl?: string }> = {
    SUBMITTED: {
      subject: "Ton profil est en cours de vérification — Agapeo",
      headline: "Profil soumis avec succès",
      contentHtml: `<p style="margin:0 0 12px 0;">Ton profil a bien été soumis pour vérification. Notre équipe l'examine et revient vers toi sous <strong>${delay}</strong>.</p><p style="margin:0;color:#94A3B8;font-size:12px;">Tant que la vérification est en cours, ton profil n'est pas encore proposé aux autres membres dans Découvrir.</p>`,
      ctaText: "Voir mon profil"
    },
    APPROVED: {
      subject: "Ton profil AGAPEO est vérifié — un engagement important avant tes premières rencontres",
      headline: "Profil vérifié ✓",
      contentHtml: `
<p style="margin:0 0 12px 0;">Bonne nouvelle : ton profil a été vérifié par notre équipe. Le badge de vérification est maintenant visible, et tu es désormais proposé(e) aux autres membres dans Découvrir. Tu peux commencer à échanger avec des personnes qui partagent ta foi et tes valeurs — et peut-être vivre une rencontre qui changera ton histoire.</p>
<p style="margin:0 0 12px 0;">Mais avant de commencer, prends quelques minutes pour lire ce message : il est important. Agapeo n'est pas seulement une plateforme de rencontre — nous voulons construire un espace où ces rencontres se vivent avec respect, discernement et responsabilité.</p>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">Notre engagement envers toi</p>
<p style="margin:0 0 8px 0;">Certaines de tes informations personnelles nous sont confiées. Nous nous engageons à :</p>
<ul style="margin:0 0 12px 0;padding-left:18px;">
  <li style="margin-bottom:4px;">Protéger tes informations personnelles — elles ne sont jamais exposées publiquement sans ton consentement.</li>
  <li style="margin-bottom:4px;">Maintenir un environnement respectueux — les comportements abusifs, harcelants, frauduleux ou contraires à nos règles peuvent faire l'objet de mesures.</li>
  <li style="margin-bottom:4px;">Te permettre de signaler tout comportement préoccupant.</li>
  <li style="margin-bottom:0;">Prendre au sérieux chaque signalement et l'examiner conformément à nos règles.</li>
</ul>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">Ta sécurité dépend aussi de tes choix</p>
<p style="margin:0 0 12px 0;">Même avec ces mesures, nous ne pouvons pas garantir les intentions réelles d'une personne rencontrée sur Internet. Un profil vérifié reste une personne que tu ne connais pas encore réellement — fais preuve de discernement, et ne laisse pas l'émotion d'une nouvelle rencontre te faire oublier ta prudence.</p>

<p style="margin:14px 0 6px 0;font-size:13px;font-weight:700;color:#1A1D21;">Ne partage jamais trop vite tes informations personnelles</p>
<p style="margin:0 0 8px 0;">Évite de communiquer rapidement : ton adresse personnelle, tes mots de passe, tes codes de connexion, tes informations bancaires, tes codes de paiement, tes documents d'identité, ou tout accès à tes comptes.</p>
<div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:12px;padding:12px 14px;color:#9F1239;font-size:13px;font-weight:600;margin:0 0 14px 0;">Agapeo ne te demandera jamais ton mot de passe ou tes codes personnels par message.</div>
<p style="margin:0 0 8px 0;">Sois également prudent(e) si une personne te demande de l'argent, te propose un investissement, ou évoque une situation urgente nécessitant une aide financière.</p>
<div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:12px;padding:12px 14px;color:#9F1239;font-size:13px;font-weight:600;margin:0 0 12px 0;">Ne transfère jamais d'argent à une personne rencontrée sur Agapeo, même si son histoire te touche.</div>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">Prends le temps de connaître la personne</p>
<p style="margin:0 0 12px 0;">Une rencontre sérieuse ne se construit pas en quelques heures. Discute, pose des questions, observe sa manière de communiquer. Découvre ses valeurs, sa vision du mariage, sa foi, ses projets — et si ses paroles restent cohérentes avec ses actes dans le temps.</p>
<p style="margin:0 0 12px 0;">Ne te sens jamais obligé(e) d'aller plus vite que tu ne le souhaites. Si quelqu'un insiste pour obtenir ton numéro, des photos privées, de l'argent ou une décision sur votre relation, prends du recul : une personne qui te respecte respectera aussi tes limites.</p>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">N'oublie pas ta foi</p>
<p style="margin:0 0 12px 0;">Agapeo est une plateforme pour célibataires chrétiens : le discernement ne repose pas uniquement sur un algorithme de compatibilité. Prends aussi le temps de prier, et de demander à Dieu la sagesse dans tes choix. Ne confonds pas une forte émotion avec une confirmation, ni une grande compatibilité avec une certitude — et ne laisse jamais une rencontre t'éloigner de tes convictions.</p>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">Si quelque chose te semble anormal, signale-le</p>
<p style="margin:0 0 8px 0;">Tu n'as pas besoin d'attendre qu'une situation devienne grave. Tu peux signaler un membre pour : comportement irrespectueux, harcèlement, demandes insistantes, tentative d'arnaque, demande d'argent, faux profil présumé, propos déplacés ou menaçants, contenu non sollicité, ou toute violation de nos règles.</p>
<p style="margin:0 0 12px 0;">Tu peux aussi bloquer une personne à tout moment. Et si tu penses être victime d'une situation grave, ne te limite pas au signalement sur Agapeo : rapproche-toi aussi des autorités compétentes.</p>

<p style="margin:22px 0 8px 0;font-size:14px;font-weight:800;color:#1A1D21;">Notre engagement. Ton engagement.</p>
<p style="margin:0 0 10px 0;">Nous pouvons construire les outils, protéger les données, modérer la plateforme et te donner les moyens de signaler ou de bloquer. Mais nous ne pouvons pas décider à ta place.</p>
<p style="margin:0 0 6px 0;"><strong style="color:#1A1D21;">Agapeo s'engage à :</strong> protéger, écouter, modérer, améliorer.</p>
<p style="margin:0 0 12px 0;"><strong style="color:#1A1D21;">Et toi, tu t'engages à :</strong> respecter, être prudent(e), prendre ton temps, protéger tes informations, signaler les comportements préoccupants, et rechercher la sagesse de Dieu dans tes décisions.</p>

<p style="margin:22px 0 0 0;">Derrière chaque profil se trouve une personne. Prends le temps de la découvrir, ne t'arrête pas à une photo, et ne laisse jamais l'envie de trouver quelqu'un te faire oublier l'importance de choisir avec discernement.</p>
<p style="margin:12px 0 0 0;">On te souhaite de belles rencontres, de belles conversations — et surtout, des rencontres qui ont du sens.</p>`,
      ctaText: "Découvrir des profils",
      ctaUrl: `${env.siteUrl}/discover`
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
          ctaUrl: cfg.ctaUrl ?? `${env.siteUrl}/profile`
        })
      })
    });
  } catch {
    // Best-effort : le statut en base (source de vérité) est déjà à jour
    // que l'email parte ou non, on ne fait jamais échouer l'action pour ça.
  }
}
