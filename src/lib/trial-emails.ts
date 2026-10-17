import "server-only";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

/** Best-effort — jamais bloquant : l'état de l'essai en base est déjà à jour, que l'email parte ou non. */
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

/**
 * Envoyée une seule fois par personne, à vie, à la toute première validation
 * de profil (cf. approveVerificationRequestAction) — jamais renvoyée si le
 * profil est revérifié plus tard, l'essai gratuit ayant déjà été consommé.
 * Séparée du long email "Profil vérifié" (sendVerificationEmail, kind
 * APPROVED, essentiellement un rappel de sécurité) pour ne pas diluer ce
 * message-là : celui-ci porte uniquement sur l'essai Premium.
 */
export async function sendTrialGrantedEmail(to: string, firstName: string) {
  await sendResendEmail(
    to,
    "Ton profil est vérifié : 24h d'accès Premium offertes !",
    buildAgapeoEmailHtml({
      title: "24h d'accès Premium offertes",
      eyebrow: "BIENVENUE",
      headline: "Tu as 24h d'accès Premium gratuit, profites-en !",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Ton profil est maintenant vérifié — et pour fêter ça, tu as <strong>24h d'accès complet à Agapeo, comme
          si tu étais Premium</strong> : consultation illimitée des profils, conversations, favoris, savoir qui
          s'intéresse à toi, filtres avancés... tout est débloqué, sans rien à payer.
        </p>
        <p style="margin:0;">
          Profites-en dès maintenant pour explorer Agapeo pleinement. Passé ce délai de 24h, les fonctionnalités
          reviendront à la version gratuite, sauf si tu choisis de passer Premium pour les garder.
        </p>
      `,
      ctaText: "Explorer Agapeo",
      ctaUrl: `${env.siteUrl}/discover`
    })
  );
}

/** `hoursLeft` vaut 14 (relance à 10h écoulées) ou 2 (relance à 22h écoulées, avec incitation à passer Premium). */
export async function sendTrialReminderEmail(to: string, firstName: string, hoursLeft: 14 | 2) {
  const isUrgent = hoursLeft === 2;
  await sendResendEmail(
    to,
    isUrgent ? "Ton accès Premium gratuit se termine dans 2h" : "Ton accès Premium gratuit se termine dans 14h",
    buildAgapeoEmailHtml({
      title: isUrgent ? "Ton accès Premium gratuit se termine dans 2h" : "Ton accès Premium gratuit se termine dans 14h",
      eyebrow: "ESSAI GRATUIT",
      headline: isUrgent ? "Il te reste 2h d'accès Premium gratuit" : "Il te reste 14h d'accès Premium gratuit",
      recipientFirstName: firstName,
      contentHtml: isUrgent
        ? `
          <p style="margin:0 0 12px 0;">
            Ton essai Premium gratuit de 24h se termine dans environ 2h. Passé ce délai, tu repasseras en version
            gratuite : consultation des profils, conversations et favoris redeviennent limités.
          </p>
          <p style="margin:0;">
            Pour continuer à profiter de tout Agapeo sans interruption, découvre nos formules Premium dès
            maintenant.
          </p>
        `
        : `
          <p style="margin:0 0 12px 0;">
            Ton essai Premium gratuit de 24h se termine dans environ 14h. D'ici là, profite de tout ce qu'Agapeo a
            à offrir : consulte les profils en entier, démarre des conversations, vois qui s'intéresse à toi.
          </p>
          <p style="margin:0;">Tu pourras aussi passer Premium à tout moment pour garder ces avantages après l'essai.</p>
        `,
      ctaText: isUrgent ? "Voir les offres Premium" : "Explorer Agapeo",
      ctaUrl: isUrgent ? `${env.siteUrl}/premium` : `${env.siteUrl}/discover`
    })
  );
}
