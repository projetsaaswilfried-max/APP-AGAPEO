// Gabarit email de marque AGAPEO, partagé par les Edge Functions qui envoient
// des emails (weekly-digest, send-scheduled-campaigns). Copie volontaire du
// même design que src/lib/email-template.ts côté app Next.js — les deux ne
// peuvent pas partager un module (runtimes différents : Deno vs Node), donc
// on les garde synchronisés manuellement si le design évolue.

const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
// Hébergé sur Supabase Storage (bucket public `avatars`) : accessible même
// si l'app Next.js elle-même n'est pas encore déployée sur un domaine public.
// Icône + texte "AGAPEO" noir pré-fusionnés en une seule image (au lieu d'un
// fond CSS + span texte) — Gmail mobile en mode sombre force certains fonds
// blancs en noir/gris et peut altérer une couleur de texte CSS, mais
// n'altère jamais les pixels d'une image.
const LOGO_BADGE_URL = "https://cfmrykzqxcjhpktuxopu.supabase.co/storage/v1/object/public/avatars/platform/agapeo-email-header-badge.png";

// `recipientFirstName`/`infoRows` sont toujours du texte brut (un prénom, un
// montant) — jamais du HTML, contrairement à `contentHtml` qui reste la
// responsabilité de chaque appelant. Sans ça, le prénom d'un membre contenant
// du HTML/JS s'afficherait tel quel (trouvé et corrigé côté src/lib/email-template.ts
// lors de l'audit sécurité — cette copie Deno l'avait manqué).
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export interface EmailInfoRow {
  label: string;
  value: string;
}

export interface EmailTemplateOptions {
  title?: string;
  preheader?: string;
  eyebrow?: string;
  headline: string;
  recipientFirstName?: string;
  contentHtml: string;
  infoRows?: EmailInfoRow[];
  ctaText?: string;
  ctaUrl?: string;
}

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
  const primaryCtaUrl = ctaUrl || SITE_URL;
  const greeting = recipientFirstName ? `Bonjour ${escapeHtml(recipientFirstName)},` : "Bonjour,";

  const infoRowsHtml = infoRows?.length
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 14px; overflow: hidden;">
        ${infoRows
          .map(
            (row, i) => `<tr>
              <td style="padding: 13px 16px; ${i > 0 ? "border-top: 1px solid #E2E8F0;" : ""} font-size: 12px; color: #94A3B8;">${escapeHtml(row.label)}</td>
              <td style="padding: 13px 16px; ${i > 0 ? "border-top: 1px solid #E2E8F0;" : ""} font-size: 13px; font-weight: 700; color: #1A1D21; text-align: right;">${escapeHtml(row.value)}</td>
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
          <tr>
            <td class="header-banner" style="background: linear-gradient(135deg, #FF8FC7 0%, #FE70B2 55%, #DE4A97 100%); padding: 28px 28px 32px 28px;">
              <img src="${LOGO_BADGE_URL}" alt="AGAPEO" width="153" height="44" style="display: block; width: 153px; height: 44px; border: 0;" />
              <p style="margin: 24px 0 0 0; font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(255,255,255,0.85);">${eyebrow}</p>
              <p style="margin: 6px 0 0 0; font-size: 25px; font-weight: 800; line-height: 1.25; color: #FFFFFF;">${headline}</p>
            </td>
          </tr>
          <tr>
            <td class="content-padding" style="padding: 30px 28px 32px 28px; background-color: #FFFFFF;">
              <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 700; color: #1A1D21;">${greeting}</p>
              <div style="font-size: 14px; line-height: 1.7; color: #475569;">${contentHtml}</div>
              ${infoRowsHtml}
              ${ctaHtml}
            </td>
          </tr>
        </table>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="480" style="width: 480px; max-width: 480px; margin-top: 20px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94A3B8;">&copy; ${new Date().getFullYear()} Agapeo — Plateforme sociale éthique pour célibataires chrétiens.</p>
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
