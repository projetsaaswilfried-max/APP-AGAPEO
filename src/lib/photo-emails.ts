import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type PhotoEmailKind = "SUBMITTED" | "APPROVED" | "REJECTED";

interface SendPhotoEmailInput {
  to: string;
  firstName: string;
  kind: PhotoEmailKind;
  rejectionReason?: string;
}

/**
 * Utilisée à la fois par la soumission (membre, addProfilePhotoAction) et
 * par la décision admin (approvePhotoAction/rejectPhotoAction). Volontairement
 * PAS dans un fichier "use server" — même raison que sendVerificationEmail :
 * aucun contrôle d'autorisation ici, c'est à l'appelant de décider qui
 * déclenche quel email.
 */
export async function sendPhotoEmail({ to, firstName, kind, rejectionReason }: SendPhotoEmailInput) {
  const configs: Record<PhotoEmailKind, { subject: string; headline: string; contentHtml: string; ctaText: string }> = {
    SUBMITTED: {
      subject: "Ta photo est en cours de vérification — Agapeo",
      headline: "Photo bien reçue",
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Ta photo a bien été reçue. Avant d'apparaître sur ton profil et d'être visible par les autres membres,
          notre équipe l'examine — tu recevras un email dès que la décision sera prise, généralement sous 48h.
        </p>
        <p style="margin:0 0 8px 0;">
          Agapeo est une plateforme chrétienne où l'éthique et la décence sont de mise. Une photo peut être refusée si
          elle est :
        </p>
        <ul style="margin:0 0 12px 0;padding-left:18px;">
          <li style="margin-bottom:4px;">indécente ou à caractère suggestif (tenue dénudée ou trop révélatrice),</li>
          <li style="margin-bottom:4px;">de mauvaise qualité (floue, sombre, méconnaissable),</li>
          <li style="margin-bottom:4px;">une photo de groupe où ton visage n'est pas clairement identifiable,</li>
          <li style="margin-bottom:0;">générique, tirée d'internet, ou ne te représentant pas réellement.</li>
        </ul>
        <p style="margin:0;color:#94A3B8;font-size:12px;">
          Tant que la vérification est en cours, cette photo n'est visible que par toi.
        </p>
      `,
      ctaText: "Voir mon profil"
    },
    APPROVED: {
      subject: "Une de tes photos a été validée — Agapeo",
      headline: "Photo validée ✓",
      contentHtml: `<p style="margin:0;">Bonne nouvelle : la photo que tu as soumise a été validée par notre équipe et est maintenant visible sur ton profil par les autres membres.</p>`,
      ctaText: "Voir mon profil"
    },
    REJECTED: {
      subject: "Une de tes photos n'a pas été validée — Agapeo",
      headline: "Photo non validée",
      contentHtml: `<p style="margin:0 0 12px 0;">Notre équipe n'a pas pu valider cette photo pour la raison suivante :</p><div style="background:#F4F6F8;border-radius:12px;padding:14px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(rejectionReason ?? "Raison non précisée.")}</div><p style="margin:12px 0 0 0;">Tu peux à tout moment supprimer cette photo et en ajouter une nouvelle depuis ton compte.</p>`,
      ctaText: "Gérer mes photos"
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
          eyebrow: "PHOTOS",
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
