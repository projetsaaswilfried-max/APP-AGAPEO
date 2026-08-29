import { getResendApiKey } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

/** Adresse de contact PUBLIQUE affichée aux membres — distincte de getSupportEmail(), qui est la boîte interne où atterrissent les notifications de nouveaux tickets. */
const SUPPORT_EMAIL = "support@agapeo.love";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface SendAccountSuspendedEmailInput {
  to: string;
  firstName: string;
  reason?: string;
}

/**
 * Envoyée par `toggleSuspendUserAction` quand un admin suspend un compte —
 * jamais à la réactivation. Best-effort comme les autres emails transactionnels :
 * la suspension (déjà appliquée en base + ban Supabase Auth) reste effective
 * même si cet envoi échoue.
 */
export async function sendAccountSuspendedEmail({ to, firstName, reason }: SendAccountSuspendedEmailInput) {
  try {
    const apiKey = getResendApiKey();
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Agapeo <support@agapeo.love>",
        to: [to],
        subject: "Ton compte Agapeo a été suspendu",
        html: buildAgapeoEmailHtml({
          title: "Compte suspendu",
          eyebrow: "SÉCURITÉ",
          headline: "Ton compte a été suspendu",
          recipientFirstName: firstName,
          contentHtml: `
            <p style="margin:0 0 12px 0;">Ton accès à Agapeo a été suspendu par notre équipe de modération${reason ? " pour la raison suivante :" : "."}</p>
            ${reason ? `<div style="background:#F4F6F8;border-radius:12px;padding:14px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(reason)}</div>` : ""}
            <p style="margin:12px 0 0 0;">Si tu penses qu'il s'agit d'une erreur, contacte notre support à <a href="mailto:${SUPPORT_EMAIL}" style="color:#FE70B2;">${SUPPORT_EMAIL}</a>.</p>
          `
        })
      })
    });
  } catch {
    // Best-effort : la suspension (base + ban Auth) est déjà effective que l'email parte ou non.
  }
}
