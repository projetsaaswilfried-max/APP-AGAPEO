import "server-only";
import { getResendApiKey, env } from "@/config/env";
import { buildAgapeoEmailHtml } from "@/lib/email-template";

/** Best-effort — jamais bloquant : le match en base est déjà acté, que l'email parte ou non. */
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
 * Envoyé aux DEUX membres dès qu'un match passe à ACCEPTED. Contenu long à
 * dessein (demande explicite du fondateur) : féliciter, encourager la
 * discrétion et le discernement (en parler à un père/mère spirituel plutôt
 * qu'à tout le monde), donner un vrai cheminement pour la suite, et prier
 * pour le couple.
 */
export async function sendMatchAcceptedEmail(to: string, firstName: string, partnerFirstName: string) {
  await sendResendEmail(
    to,
    "Félicitations, votre match est confirmé ! 🎉",
    buildAgapeoEmailHtml({
      title: "Votre match est confirmé",
      eyebrow: "MATCH",
      headline: `${partnerFirstName} et toi venez de matcher !`,
      recipientFirstName: firstName,
      contentHtml: `
        <p style="margin:0 0 14px 0;">
          C'est une magnifique nouvelle : toi et <strong>${partnerFirstName}</strong> avez tous les deux confirmé
          vouloir avancer ensemble. Vous démarrez officiellement une relation, et toute l'équipe Agapeo s'en réjouit
          avec vous. Depuis cet instant, vos deux profils ne sont plus visibles dans Découvrir — vous restez ainsi
          l'un pour l'autre tant que votre relation dure.
        </p>

        <p style="margin:0 0 6px 0;font-weight:700;color:#1A1D21;">Un conseil avant toute chose : restez discrets</p>
        <p style="margin:0 0 14px 0;">
          Une nouvelle relation est une graine fragile : elle grandit mieux à l'abri des regards et des avis
          extérieurs non sollicités. Évitez d'annoncer votre relation publiquement dans l'immédiat. Nous vous
          encourageons plutôt à en parler d'abord, en toute discrétion, à votre père ou mère spirituel(le), un
          couple de mentors ou un responsable de votre église — une personne mûre dans la foi qui pourra vous
          accompagner, vous poser les bonnes questions et prier avec vous pour la suite.
        </p>

        <p style="margin:0 0 6px 0;font-weight:700;color:#1A1D21;">Le chemin qui s'ouvre devant vous</p>
        <ul style="margin:0 0 14px 0;padding-left:18px;">
          <li style="margin-bottom:6px;">Prenez le temps d'apprendre à vous connaître au-delà des messages : appels, rencontres encadrées, temps en famille ou en communauté.</li>
          <li style="margin-bottom:6px;">Parlez ouvertement de vos attentes sur la foi, le mariage, la famille et vos projets de vie — la clarté maintenant évite bien des blessures plus tard.</li>
          <li style="margin-bottom:6px;">Impliquez rapidement un accompagnement spirituel (pasteur, mentor, conseiller conjugal chrétien) pour baliser les prochaines étapes : fréquentation, fiançailles, préparation au mariage.</li>
          <li style="margin-bottom:0;">Gardez la pureté et le respect mutuel au cœur de votre relation, à chaque étape.</li>
        </ul>

        <p style="margin:0 0 6px 0;font-weight:700;color:#1A1D21;">Une prière pour vous deux</p>
        <p style="margin:0;font-style:italic;">
          « Seigneur, nous te confions ${firstName} et ${partnerFirstName} en ce début d'histoire. Que ta présence
          guide chacun de leurs pas, que ton amour soit le modèle du leur, et que leur relation grandisse dans la
          vérité, la patience et le respect. Donne-leur le discernement à chaque étape, et entoure-les de
          personnes sages pour les accompagner. Amen. »
        </p>
      `,
      ctaText: "Retourner à votre conversation",
      ctaUrl: `${env.siteUrl}/messages`
    })
  );
}
