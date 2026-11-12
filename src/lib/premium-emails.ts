import "server-only";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";
import { buildSupportWhatsAppEmailBlock } from "@/config/support";

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

/**
 * `holdDays` : jours mis en réserve parce que le profil n'est pas encore
 * validé (cf. migration hold_subscription_until_photo_verified). Dans ce cas
 * aucune échéance ne court, et annoncer une date de fin serait faux —
 * l'email dit alors que le décompte démarrera à la validation.
 */
export async function sendPremiumActivatedEmail(
  to: string,
  firstName: string,
  amount: { value: number; currency: string },
  periodEnd: Date | null,
  periodDays: number,
  holdDays?: number | null
) {
  const onHold = holdDays != null && holdDays > 0;
  const heldDayLabel = onHold ? `${Math.ceil(holdDays)} jour${Math.ceil(holdDays) > 1 ? "s" : ""}` : "";

  await sendResendEmail(
    to,
    "Bienvenue dans Agapeo Premium !",
    buildAgapeoEmailHtml({
      title: "Bienvenue dans Agapeo Premium",
      eyebrow: "PREMIUM",
      headline: onHold ? "Ton paiement est bien reçu !" : "Félicitations, ton abonnement est actif !",
      recipientFirstName: firstName,
      contentHtml: onHold
        ? `
        <p style="margin:0 0 12px 0;">
          Merci pour ta confiance : ton paiement a bien été reçu. Il ne manque plus que la validation de ta photo par
          notre équipe pour que tu puisses écrire aux membres qui t'intéressent.
        </p>
        <p style="margin:0 0 12px 0;">
          <strong>Tes ${heldDayLabel} sont mis de côté et ne s'écoulent pas</strong> : le décompte ne démarrera qu'à la
          validation de ton profil, pour que tu profites de ton abonnement en entier.
        </p>
      `
        : `
        <p style="margin:0 0 12px 0;">
          Merci pour ta confiance : ton paiement a bien été reçu et ton accès Premium est actif dès maintenant.
          Tu peux désormais contacter en priorité, voir qui s'intéresse à toi, utiliser les filtres avancés et
          consulter les profils sans limite.
        </p>
        <p style="margin:0;color:#94A3B8;font-size:12px;">
          Ton accès est valable ${periodDays} jours : renouvelable à tout moment depuis l'onglet "Mon Plan" de ton compte.
        </p>
      `,
      infoRows: [
        { label: "Montant", value: `${amount.value} ${amount.currency}` },
        onHold
          ? { label: "Décompte", value: `${heldDayLabel}, dès la validation de ta photo` }
          : {
              label: "Valable jusqu'au",
              value: (periodEnd ?? new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000)).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })
            }
      ],
      ctaText: onHold ? "Faire valider ma photo" : "Découvrir Premium",
      ctaUrl: onHold ? `${env.siteUrl}/profile?tab=account` : `${env.siteUrl}/premium`
    })
  );
}

/** `reason`: "expired" (non-renouvelé à temps, cron automatique) ou "admin" (retiré manuellement depuis l'espace admin). */
export async function sendPremiumRemovedEmail(to: string, firstName: string, reason: "expired" | "admin") {
  const contentHtml =
    reason === "expired"
      ? `<p style="margin:0 0 12px 0;">Ton abonnement Premium Agapeo est arrivé à échéance et n'a pas été renouvelé à temps : ton compte est repassé en version gratuite.</p><p style="margin:0;">Tu peux te réabonner à tout moment pour retrouver tous tes avantages : contact en priorité, favoris, qui s'intéresse à toi, filtres avancés et consultation illimitée.</p>${buildSupportWhatsAppEmailBlock("SUBSCRIPTION_EXPIRED", "Tu as payé mais l'accès n'est pas revenu ?")}`
      : `<p style="margin:0 0 12px 0;">Ton accès Premium Agapeo a été retiré par notre équipe.</p>${buildSupportWhatsAppEmailBlock("SUBSCRIPTION_EXPIRED", "Tu penses qu'il s'agit d'une erreur ?")}`;

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
