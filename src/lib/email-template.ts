import { SITE_CONFIG } from "@/config/site";

/**
 * Hébergé sur Supabase Storage (bucket public `avatars`) plutôt que servi par
 * l'app Next.js elle-même : un client email externe ne peut pas atteindre
 * `NEXT_PUBLIC_SITE_URL` tant que l'app n'est pas déployée sur un vrai domaine
 * public — cette URL, elle, fonctionne dès maintenant quel que soit l'état du
 * déploiement.
 */
/**
 * Logo + cercle blanc pré-fusionnés en une seule image (au lieu d'un fond
 * CSS background-color) — Gmail mobile en mode sombre force certains fonds
 * blancs en noir/gris, mais n'altère jamais les pixels d'une image.
 */
export const EMAIL_LOGO_BADGE_URL =
  "https://cfmrykzqxcjhpktuxopu.supabase.co/storage/v1/object/public/avatars/platform/agapeo-logo-email-badge.png";

export interface EmailInfoRow {
  label: string;
  value: string;
}

export interface EmailTemplateOptions {
  title?: string;
  preheader?: string;
  /** Petit libellé en majuscules au-dessus du titre (ex: "SUPPORT", "SÉCURITÉ"). */
  eyebrow?: string;
  /** Gros titre affiché dans le bandeau coloré — le message principal en un coup d'œil. */
  headline: string;
  recipientFirstName?: string;
  contentHtml: string;
  /** Lignes label/valeur optionnelles (ex: montant, produit) affichées comme un petit tableau encadré. */
  infoRows?: EmailInfoRow[];
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * AGAPEO Master Email Template — gabarit simple : bandeau dégradé rose avec
 * message clé, corps blanc épuré, bouton d'action, pied de page minimal.
 */
export function buildAgapeoEmailHtml({
  title = "AGAPEO",
  preheader = "Alliance Chrétienne pour le Mariage",
  eyebrow = "AGAPEO",
  headline,
  recipientFirstName,
  contentHtml,
  infoRows,
  ctaText,
  ctaUrl
}: EmailTemplateOptions): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_CONFIG.url;
  const primaryCtaUrl = ctaUrl || siteUrl;
  const greeting = recipientFirstName ? `Bonjour ${recipientFirstName},` : "Bonjour,";

  const infoRowsHtml = infoRows?.length
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden;">
        ${infoRows
          .map(
            (row, i) => `<tr>
              <td style="padding: 13px 16px; ${i > 0 ? "border-top: 1px solid #E2E8F0;" : ""} font-size: 12px; color: #94A3B8;">${row.label}</td>
              <td style="padding: 13px 16px; ${i > 0 ? "border-top: 1px solid #E2E8F0;" : ""} font-size: 13px; font-weight: 700; color: #1A1D21; text-align: right;">${row.value}</td>
            </tr>`
          )
          .join("")}
      </table>`
    : "";

  const ctaHtml = ctaText
    ? `<a href="${primaryCtaUrl}" target="_blank" style="display: block; background-color: #FE70B2; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 15px; border-radius: 9999px; text-align: center; margin-top: 24px;">${ctaText}</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F1F3F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    a { color: #FE70B2; }
    @media only screen and (max-width: 600px) {
      .email-card { width: 100% !important; border-radius: 0px !important; }
      .content-padding { padding: 26px 20px !important; }
      .header-banner { padding: 24px 20px 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F3F5; color: #1E293B;">

  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #F1F3F5;">
    ${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F3F5; padding: 30px 12px 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" border="0" cellpadding="0" cellspacing="0" width="480" style="width: 480px; max-width: 480px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 30px rgba(26, 29, 33, 0.08);">

          <!-- BANDEAU DÉGRADÉ ROSE — logo + message clé -->
          <tr>
            <td class="header-banner" style="background: linear-gradient(135deg, #FF8FC7 0%, #FE70B2 55%, #DE4A97 100%); padding: 28px 28px 32px 28px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 40px; height: 40px; text-align: center; vertical-align: middle;">
                    <img src="${EMAIL_LOGO_BADGE_URL}" alt="AGAPEO" width="40" height="40" style="display: block; width: 40px; height: 40px; border: 0; border-radius: 50%;" />
                  </td>
                  <td style="padding-left: 10px; vertical-align: middle;">
                    <span style="color: #FFFFFF; font-weight: 700; font-size: 15px; letter-spacing: -0.01em;">Agapeo</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(255,255,255,0.85);">${eyebrow}</p>
              <p style="margin: 6px 0 0 0; font-size: 25px; font-weight: 800; line-height: 1.25; color: #FFFFFF;">${headline}</p>
            </td>
          </tr>

          <!-- CORPS -->
          <tr>
            <td class="content-padding" style="padding: 30px 28px 32px 28px; background-color: #FFFFFF;">
              <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #1A1D21;">${greeting}</p>
              <div style="font-size: 14px; line-height: 1.7; color: #475569;">${contentHtml}</div>
              ${infoRowsHtml}
              ${ctaHtml}
            </td>
          </tr>

        </table>

        <!-- PIED DE PAGE MINIMAL -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="480" style="width: 480px; max-width: 480px; margin-top: 20px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94A3B8;">&copy; ${new Date().getFullYear()} ${SITE_CONFIG.name} — ${SITE_CONFIG.description}</p>
              <p style="margin: 0; font-size: 10px; color: #B4BCC7;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.</p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
