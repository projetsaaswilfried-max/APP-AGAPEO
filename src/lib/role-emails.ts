import "server-only";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";
import type { AppRole } from "@/lib/supabase/database.types";

/** Best-effort — jamais bloquant : le rôle en base est déjà à jour, que l'email parte ou non. */
async function sendResendEmail(to: string, subject: string, html: string) {
  try {
    const apiKey = getResendApiKey();
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Agapeo <support@agapeo.love>", to: [to], subject, html })
    });
  } catch (err) {
    console.error(`Échec d'envoi de l'email "${subject}" à ${to} :`, err);
  }
}

const ROLE_CONTENT: Record<AppRole, { subject: string; headline: string; contentHtml: string } | null> = {
  USER: {
    subject: "Ton rôle sur Agapeo a été mis à jour",
    headline: "Retour au statut membre",
    contentHtml: `<p style="margin:0;">Ton rôle sur Agapeo est repassé à celui d'un membre standard. Tu conserves bien sûr l'accès à ton compte et à toutes les fonctionnalités membre.</p>`
  },
  MODERATOR: {
    subject: "Tu es maintenant Modérateur sur Agapeo",
    headline: "Bienvenue dans l'équipe de modération",
    contentHtml: `<p style="margin:0 0 12px 0;">Tu viens de recevoir le rôle de <strong>Modérateur</strong> sur Agapeo. Tu as désormais accès à l'espace de modération, avec :</p><ul style="margin:0 0 12px 0;padding-left:18px;"><li style="margin-bottom:4px;">les signalements des membres,</li><li style="margin-bottom:4px;">les tickets du support,</li><li style="margin-bottom:0;">les demandes de vérification de profil.</li></ul><p style="margin:0;">Merci pour ton engagement à garder la plateforme sûre et respectueuse.</p>`
  },
  ADMIN: {
    subject: "Tu es maintenant Administrateur sur Agapeo",
    headline: "Bienvenue dans l'équipe d'administration",
    contentHtml: `<p style="margin:0 0 12px 0;">Tu viens de recevoir le rôle d'<strong>Administrateur</strong> sur Agapeo. En plus de la modération (signalements, support, vérifications), tu as désormais accès à :</p><ul style="margin:0 0 12px 0;padding-left:18px;"><li style="margin-bottom:4px;">la gestion des membres (suspension, accès Premium),</li><li style="margin-bottom:4px;">la publication de contenu officiel dans le fil,</li><li style="margin-bottom:4px;">les campagnes email,</li><li style="margin-bottom:0;">les transactions.</li></ul><p style="margin:0;">Merci pour ton engagement auprès de la communauté Agapeo.</p>`
  },
  SUPER_ADMIN: null
};

/** Notifie un membre lorsque son rôle change — appelé juste après `updateUserRoleAction`. SUPER_ADMIN n'est jamais assignable via cette action, donc jamais notifié ici. */
export async function sendRoleChangedEmail(to: string, firstName: string, role: AppRole) {
  const cfg = ROLE_CONTENT[role];
  if (!cfg) return;

  await sendResendEmail(
    to,
    cfg.subject,
    buildAgapeoEmailHtml({
      title: cfg.subject,
      eyebrow: "RÔLE",
      headline: cfg.headline,
      recipientFirstName: firstName,
      contentHtml: cfg.contentHtml,
      ctaText: role === "USER" ? "Aller sur Agapeo" : "Accéder à l'espace",
      ctaUrl: role === "USER" ? env.siteUrl : `${env.siteUrl}/admin`
    })
  );
}
