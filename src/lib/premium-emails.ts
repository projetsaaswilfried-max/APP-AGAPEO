import "server-only";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

/** Best-effort — jamais bloquant : l'état de l'abonnement en base est déjà à jour, que l'email parte ou non. */
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

export async function sendPremiumActivatedEmail(
  to: string,
  firstName: string,
  amount: { value: number; currency: string },
  periodEnd: Date
) {
  await sendResendEmail(
    to,
    "Bienvenue dans Agapeo Premium !",
    buildAgapeoEmailHtml({
      title: "Bienvenue dans Agapeo Premium",
      eyebrow: "PREMIUM",
      headline: "Félicitations, ton abonnement est actif !",
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 12px 0;">
          Merci pour ta confiance — ton paiement a bien été reçu et ton accès Premium est actif dès maintenant.
          Tu peux désormais contacter en priorité, voir qui s'intéresse à toi, utiliser les filtres avancés et
          consulter les profils sans limite.
        </p>
        <p style="margin:0;color:#94A3B8;font-size:12px;">
          Ton accès est valable 30 jours — renouvelable à tout moment depuis l'onglet "Mon Plan" de ton compte.
        </p>
      `,
      infoRows: [
        { label: "Montant", value: `${amount.value} ${amount.currency}` },
        { label: "Valable jusqu'au", value: periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) }
      ],
      ctaText: "Découvrir Premium",
      ctaUrl: `${env.siteUrl}/premium`
    })
  );
}

/** `reason`: "expired" (non-renouvelé à temps, cron automatique) ou "admin" (retiré manuellement depuis l'espace admin). */
export async function sendPremiumRemovedEmail(to: string, firstName: string, reason: "expired" | "admin") {
  const contentHtml =
    reason === "expired"
      ? `<p style="margin:0 0 12px 0;">Ton abonnement Premium Agapeo est arrivé à échéance et n'a pas été renouvelé à temps — ton compte est repassé en version gratuite.</p><p style="margin:0;">Tu peux te réabonner à tout moment pour retrouver tous tes avantages : contact en priorité, favoris, qui s'intéresse à toi, filtres avancés et consultation illimitée.</p>`
      : `<p style="margin:0 0 12px 0;">Ton accès Premium Agapeo a été retiré par notre équipe.</p><p style="margin:0;">Si tu penses qu'il s'agit d'une erreur, contacte-nous depuis l'espace Support de l'application.</p>`;

  await sendResendEmail(
    to,
    "Ton accès Premium n'est plus actif",
    buildAgapeoEmailHtml({
      title: "Ton accès Premium n'est plus actif",
      eyebrow: "PREMIUM",
      headline: reason === "expired" ? "Ton abonnement a expiré" : "Ton accès Premium a été retiré",
      recipientFirstName: firstName,
      contentHtml,
      ctaText: "Se réabonner",
      ctaUrl: `${env.siteUrl}/premium`
    })
  );
}
