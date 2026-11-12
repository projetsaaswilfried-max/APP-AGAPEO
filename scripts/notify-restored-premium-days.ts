/**
 * Prévient les membres dont les jours d'abonnement perdus ont été rendus
 * (cf. migration restore_days_lost_waiting_for_verification).
 *
 * Leur abonnement s'écoulait pendant que leur profil attendait sa validation,
 * donc sans qu'ils puissent écrire à qui que ce soit. Ces jours leur ont été
 * recrédités ; ce script leur explique pourquoi et ce qui change.
 *
 * Idempotence : `subscription_credits.notified_at` est posé après chaque envoi
 * réussi, donc relancer le script n'écrit jamais deux fois à la même personne.
 *
 * Usage :
 *   npx tsx scripts/notify-restored-premium-days.ts            (dry-run)
 *   npx tsx scripts/notify-restored-premium-days.ts --execute
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildAgapeoEmailHtml } from "../src/lib/email-template";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

/**
 * Adresse de production écrite en dur, jamais lue dans l'environnement :
 * `.env.local` définit NEXT_PUBLIC_SITE_URL=http://localhost:3000 et gagnerait
 * silencieusement le repli du gabarit d'email — c'est exactement ce qui avait
 * envoyé un lien localhost dans un vrai envoi de masse. On écrase aussi la
 * variable pour que le gabarit lui-même ne puisse pas retomber dessus.
 */
const SITE_URL = "https://www.agapeo.love";
process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "Agapeo <support@agapeo.love>";
const CREDIT_REASON = "verification_delay_2026_11";

const EXECUTE = process.argv.includes("--execute");
/** `--preview=<dossier>` écrit les deux variantes sur disque pour les relire avant envoi. */
const PREVIEW_DIR = process.argv.find((a) => a.startsWith("--preview="))?.split("=")[1];

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Resend plafonne à 10 requêtes/seconde. */
const RESEND_DELAY_MS = 150;

interface Recipient {
  userId: string;
  creditId: string;
  firstName: string;
  email: string;
  days: number;
  /** true tant que la photo n'est pas validée : les jours sont en réserve. */
  onHold: boolean;
  periodEnd: string | null;
}

function buildEmail(recipient: Recipient): { subject: string; html: string } {
  const { days, firstName, onHold, periodEnd } = recipient;
  const dayLabel = `${days} jour${days > 1 ? "s" : ""}`;

  const commonIntro = `
    <p style="margin:0 0 14px 0;">
      Tu as pris un abonnement Agapeo alors que ton profil n'avait pas encore été validé par notre équipe. Tes jours ont
      commencé à s'écouler pendant ce temps-là, alors que tu ne pouvais pas encore écrire aux personnes qui t'intéressaient.
      Ce n'était pas juste.
    </p>`;

  if (onHold) {
    return {
      subject: `On te rend ${dayLabel} d'abonnement`,
      html: buildAgapeoEmailHtml({
        preheader: `${dayLabel} remis sur ton compte, en attente de la validation de ta photo.`,
        eyebrow: "TON ABONNEMENT",
        headline: `On te rend ${dayLabel}`,
        recipientFirstName: firstName,
        contentHtml: `
          ${commonIntro}
          <p style="margin:0 0 14px 0;">
            <strong>Ces ${dayLabel} sont de nouveau sur ton compte</strong>, et ils ne s'écoulent pas : ils t'attendent.
            Le décompte démarrera le jour où ta photo sera validée, pour que tu profites de ton abonnement en entier.
          </p>
          <p style="margin:0;">
            C'est aussi la règle pour tout le monde désormais : tant qu'un profil n'est pas validé, les jours payés restent
            de côté.
          </p>`,
        infoRows: [
          { label: "Jours rendus", value: dayLabel },
          { label: "Décompte", value: "démarre à la validation de ta photo" }
        ],
        ctaText: "Faire valider ma photo",
        ctaUrl: `${SITE_URL}/profile?tab=account`
      })
    };
  }

  const endLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return {
    subject: `On te rend ${dayLabel} d'abonnement`,
    html: buildAgapeoEmailHtml({
      preheader: `${dayLabel} ajoutés à ton abonnement Agapeo.`,
      eyebrow: "TON ABONNEMENT",
      headline: `On te rend ${dayLabel}`,
      recipientFirstName: firstName,
      contentHtml: `
        ${commonIntro}
        <p style="margin:0 0 14px 0;">
          <strong>Ces ${dayLabel} viennent d'être ajoutés à ton abonnement</strong>, utilisables tout de suite.
        </p>
        <p style="margin:0;">
          Et c'est désormais la règle pour tout le monde : tant qu'un profil n'est pas validé, les jours payés restent de
          côté et ne s'écoulent pas.
        </p>`,
      infoRows: [
        { label: "Jours rendus", value: dayLabel },
        ...(endLabel ? [{ label: "Ton accès est valable jusqu'au", value: endLabel }] : [])
      ],
      ctaText: "Découvrir des profils",
      ctaUrl: `${SITE_URL}/discover`
    })
  };
}

async function sendResendEmail(to: string, subject: string, html: string) {
  await sleep(RESEND_DELAY_MS);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  if (!res.ok) throw new Error(`Resend ${res.status} : ${await res.text()}`);
}

async function loadRecipients(): Promise<Recipient[]> {
  const { data: credits, error } = await admin
    .from("subscription_credits")
    .select("id, user_id, days")
    .eq("reason", CREDIT_REASON)
    .is("notified_at", null);
  if (error) throw new Error(error.message);

  const recipients: Recipient[] = [];
  for (const credit of credits ?? []) {
    const [{ data: profile }, { data: restricted }, authUser] = await Promise.all([
      admin.from("profiles").select("first_name, photo_verification_status").eq("id", credit.user_id).maybeSingle(),
      admin
        .from("profile_restricted")
        .select("subscription_hold_days, subscription_current_period_end")
        .eq("id", credit.user_id)
        .maybeSingle(),
      admin.auth.admin.getUserById(credit.user_id)
    ]);
    const email = authUser?.data?.user?.email;
    if (!profile || !restricted || !email) continue;

    recipients.push({
      userId: credit.user_id,
      creditId: credit.id,
      firstName: profile.first_name ?? "",
      email,
      days: Math.round(Number(credit.days)),
      onHold: restricted.subscription_hold_days !== null,
      periodEnd: restricted.subscription_current_period_end
    });
  }
  return recipients;
}

async function main() {
  console.log(EXECUTE ? "--- EXÉCUTION RÉELLE ---" : "--- DRY RUN (ajoute --execute pour envoyer réellement) ---");

  const recipients = await loadRecipients();
  const onHold = recipients.filter((r) => r.onHold).length;
  console.log(`À prévenir : ${recipients.length}`);
  console.log(`  jours en réserve (photo pas encore validée) : ${onHold}`);
  console.log(`  jours immédiatement utilisables : ${recipients.length - onHold}`);
  console.log(`  total de jours rendus : ${recipients.reduce((sum, r) => sum + r.days, 0)}`);

  if (PREVIEW_DIR) {
    for (const variant of ["reserve", "immediat"] as const) {
      const sample = recipients.find((r) => (variant === "reserve" ? r.onHold : !r.onHold));
      if (!sample) continue;
      const { subject, html } = buildEmail(sample);
      const path = `${PREVIEW_DIR}/email-${variant}.html`;
      writeFileSync(path, html);
      console.log(`
Aperçu ${variant} : ${path}
  sujet : ${subject}`);
    }
    return;
  }

  if (!EXECUTE) {
    const sample = recipients[0];
    if (sample) {
      const { subject } = buildEmail(sample);
      console.log(`\nExemple de sujet : ${subject}`);
      console.log(`Destinataire type : ${sample.firstName || "(sans prénom)"}, ${sample.days} jours, réserve=${sample.onHold}`);
    }
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      const { subject, html } = buildEmail(recipient);
      await sendResendEmail(recipient.email, subject, html);
      const { error } = await admin
        .from("subscription_credits")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", recipient.creditId);
      if (error) throw new Error(`Marquage : ${error.message}`);
      sent++;
      if (sent % 20 === 0) console.log(`... ${sent} envoyés`);
    } catch (err) {
      failed++;
      console.error(`[email] ${recipient.userId} : ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("--- Terminé ---");
  console.log(`Envoyés : ${sent} | Échecs : ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
