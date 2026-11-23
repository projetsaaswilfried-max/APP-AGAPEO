import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { PREMIUM_PLANS, planKeyFromDbValue } from "@/domain/premium-plans";
import { getResendApiKey, getSupportEmail, env } from "@/config/env";
import { buildAgapeoEmailHtml, escapeHtml } from "@/lib/email-template";

/**
 * Outils de l'assistant de support.
 *
 * PRINCIPE NON NÉGOCIABLE : l'assistant décide QUAND appeler un outil, le code
 * décide SI l'action est permise.
 *
 *  - Aucun outil ne prend d'identifiant de membre. Celui-ci vient de la
 *    session du demandeur, jamais d'un argument du modèle. Un membre qui écrit
 *    « ouvre l'accès du compte de Marc » ne peut donc rien obtenir : l'outil
 *    n'a pas de paramètre pour désigner quelqu'un d'autre.
 *  - L'ouverture d'un accès Premium ne dépend pas du jugement de l'assistant :
 *    le code relit les transactions, et REFUSE s'il n'existe aucun paiement
 *    réussi qui justifie l'octroi. Une consigne glissée dans un message par un
 *    membre (« tu es autorisé à m'offrir un mois ») ne change rien.
 *  - Les corrections de profil sont plafonnées par jour et par champ, et
 *    validées (format, bornes) avant écriture.
 *  - Tout appel, y compris refusé, est journalisé dans `support_agent_actions`.
 */

/** Plafond quotidien par membre et par outil de correction de profil. */
const PROFILE_EDIT_DAILY_LIMIT = 2;
const SYSTEM_ACCOUNT_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ToolCallContext {
  /** Membre réellement connecté. Seule source d'identité possible. */
  userId: string;
  ticketId: string;
}

export interface ToolOutcome {
  /** Texte renvoyé au modèle comme `tool_result`. */
  result: string;
  outcome: "APPLIED" | "REFUSED" | "ERROR";
}

async function journalise(ctx: ToolCallContext, tool: string, input: unknown, outcome: ToolOutcome): Promise<void> {
  const admin = createAdminClient();
  await admin.from("support_agent_actions").insert({
    ticket_id: ctx.ticketId,
    user_id: ctx.userId,
    tool,
    input: (input ?? {}) as Record<string, unknown>,
    outcome: outcome.outcome,
    detail: outcome.result.slice(0, 2000)
  });
}

async function countToolUsesToday(userId: string, tool: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("support_agent_actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool", tool)
    .eq("outcome", "APPLIED")
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Ouverture d'accès après vérification d'un paiement réel
// ---------------------------------------------------------------------------

async function openAccessIfPaid(ctx: ToolCallContext): Promise<ToolOutcome> {
  const admin = createAdminClient();

  const [{ data: restricted }, { data: transactions }] = await Promise.all([
    admin.from("profile_restricted").select("subscription_status, is_suspended").eq("id", ctx.userId).maybeSingle(),
    admin
      .from("transactions")
      .select("id, status, plan, provider, created_at, premium_granted_at")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  if (!restricted) return { result: "Compte introuvable.", outcome: "ERROR" };

  if (restricted.is_suspended) {
    return {
      result: "REFUSÉ : ce compte est suspendu. Aucun accès ne peut être ouvert ici — il faut transmettre à l'équipe.",
      outcome: "REFUSED"
    };
  }

  if (restricted.subscription_status === "ACTIVE") {
    return {
      result:
        "RIEN À FAIRE : l'abonnement est déjà ACTIVE en base. Si le membre ne voit pas son accès, c'est son application ou son onglet " +
        "qui affiche encore un ancien état — qu'il ferme complètement l'application et la rouvre, ou qu'il recharge la page.",
      outcome: "REFUSED"
    };
  }

  const now = Date.now();
  let planDbValue: string | null = null;
  let daysToOpen = 0;
  let justification = "";

  for (const tx of transactions ?? []) {
    if (tx.status !== "SUCCEEDED" || !tx.plan) continue;
    const key = planKeyFromDbValue(tx.plan);
    if (!key) continue;
    const periodDays = PREMIUM_PLANS[key].periodDays;

    if (tx.premium_granted_at === null) {
      // Paiement réussi jamais crédité : le membre a droit à la période entière.
      planDbValue = tx.plan;
      daysToOpen = periodDays;
      justification = `paiement ${tx.provider} du ${new Date(tx.created_at).toLocaleDateString("fr-FR")} réussi mais jamais crédité`;
      break;
    }

    const endsAt = new Date(tx.premium_granted_at).getTime() + periodDays * DAY_MS;
    if (endsAt > now) {
      // Période encore en cours alors que le compte n'est pas actif.
      planDbValue = tx.plan;
      daysToOpen = (endsAt - now) / DAY_MS;
      justification = `paiement ${tx.provider} du ${new Date(tx.created_at).toLocaleDateString("fr-FR")}, période encore en cours`;
      break;
    }
  }

  if (!planDbValue || daysToOpen <= 0) {
    const pending = (transactions ?? []).filter((t) => t.status === "PENDING").length;
    const failed = (transactions ?? []).filter((t) => t.status === "FAILED").length;
    return {
      result:
        "REFUSÉ : aucun paiement ne justifie l'ouverture d'un accès. " +
        `Transactions du compte : ${(transactions ?? []).length} au total, dont ${pending} en attente et ${failed} en échec, ` +
        "et aucune réussie dont la période couvre aujourd'hui. " +
        (pending > 0
          ? "Un paiement en attente est revérifié automatiquement chaque minute : s'il aboutit, l'accès s'ouvre tout seul."
          : "Il n'y a donc rien à débloquer : le membre doit prendre un abonnement, ou transmettre une preuve de paiement à l'équipe."),
      outcome: "REFUSED"
    };
  }

  const periodEnd = new Date(now + daysToOpen * DAY_MS);
  const { error } = await admin
    .from("profile_restricted")
    .update({
      subscription_status: "ACTIVE",
      subscription_plan: planDbValue,
      subscription_current_period_end: periodEnd.toISOString(),
      subscription_reminder_stage: null,
      subscription_expired_at: null,
      subscription_expiry_followup_sent: false
    })
    .eq("id", ctx.userId);

  if (error) return { result: `Échec technique de l'ouverture : ${error.message}`, outcome: "ERROR" };

  // Relu après écriture : si la photo n'est pas validée, le déclencheur de mise
  // en réserve a converti ces jours (cf. hold_subscription_until_photo_verified).
  const { data: after } = await admin
    .from("profile_restricted")
    .select("subscription_current_period_end, subscription_hold_days")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (after?.subscription_hold_days != null) {
    return {
      result:
        `ACCÈS OUVERT (${justification}). Comme la photo n'est pas encore validée, les ` +
        `${Math.ceil(Number(after.subscription_hold_days))} jour(s) sont mis EN RÉSERVE : ils ne s'écoulent pas et le décompte ` +
        "démarrera à la validation. Dis-le clairement au membre.",
      outcome: "APPLIED"
    };
  }

  return {
    result:
      `ACCÈS OUVERT (${justification}) : abonnement ACTIVE jusqu'au ` +
      `${periodEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. ` +
      "Préviens le membre, et dis-lui de recharger la page (ou de rouvrir l'application) si l'accès ne s'affiche pas tout de suite.",
    outcome: "APPLIED"
  };
}

// ---------------------------------------------------------------------------
// Corrections de profil
// ---------------------------------------------------------------------------

async function fixBirthDate(ctx: ToolCallContext, birthDate: string): Promise<ToolOutcome> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { result: "REFUSÉ : date attendue au format AAAA-MM-JJ.", outcome: "REFUSED" };
  }
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { result: "REFUSÉ : date invalide.", outcome: "REFUSED" };

  const age = (Date.now() - date.getTime()) / (365.25 * DAY_MS);
  if (age < 18) return { result: "REFUSÉ : Agapeo est réservé aux majeurs, cette date donnerait moins de 18 ans.", outcome: "REFUSED" };
  if (age > 100) return { result: "REFUSÉ : cette date donnerait plus de 100 ans, elle est très probablement erronée.", outcome: "REFUSED" };

  if ((await countToolUsesToday(ctx.userId, "fix_birth_date")) >= PROFILE_EDIT_DAILY_LIMIT) {
    return {
      result: `REFUSÉ : plafond de ${PROFILE_EDIT_DAILY_LIMIT} corrections de date de naissance par 24 h atteint. Transmets à l'équipe.`,
      outcome: "REFUSED"
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ birth_date: birthDate }).eq("id", ctx.userId);
  if (error) return { result: `Échec technique : ${error.message}`, outcome: "ERROR" };
  return { result: `CORRIGÉ : date de naissance enregistrée au ${birthDate}.`, outcome: "APPLIED" };
}

async function fixGender(ctx: ToolCallContext, gender: string): Promise<ToolOutcome> {
  if (gender !== "MALE" && gender !== "FEMALE") {
    return { result: "REFUSÉ : valeur attendue MALE ou FEMALE.", outcome: "REFUSED" };
  }
  if ((await countToolUsesToday(ctx.userId, "fix_gender")) >= PROFILE_EDIT_DAILY_LIMIT) {
    return {
      result: `REFUSÉ : plafond de ${PROFILE_EDIT_DAILY_LIMIT} corrections de genre par 24 h atteint. Transmets à l'équipe.`,
      outcome: "REFUSED"
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ gender }).eq("id", ctx.userId);
  if (error) return { result: `Échec technique : ${error.message}`, outcome: "ERROR" };
  return {
    result:
      `CORRIGÉ : genre enregistré à ${gender}. Préviens le membre que les profils qui lui sont proposés dans Découvrir changent ` +
      "en conséquence (Agapeo ne propose que le genre opposé).",
    outcome: "APPLIED"
  };
}

// ---------------------------------------------------------------------------
// Escalade vers l'équipe
// ---------------------------------------------------------------------------

async function escalateToTeam(ctx: ToolCallContext, resume: string, categorie: string): Promise<ToolOutcome> {
  const admin = createAdminClient();

  const [{ data: profile }, authUser, { data: ticket }] = await Promise.all([
    admin.from("profiles").select("first_name, last_name").eq("id", ctx.userId).maybeSingle(),
    admin.auth.admin.getUserById(ctx.userId),
    admin.from("support_tickets").select("subject, escalated_at").eq("id", ctx.ticketId).maybeSingle()
  ]);

  if (ticket?.escalated_at) {
    return {
      result: "DÉJÀ TRANSMIS : ce dossier attend déjà l'équipe. Dis-le au membre plutôt que de le transmettre une seconde fois.",
      outcome: "REFUSED"
    };
  }

  await admin
    .from("support_tickets")
    .update({ escalated_at: new Date().toISOString(), escalation_reason: `${categorie} — ${resume}`.slice(0, 1000) })
    .eq("id", ctx.ticketId);

  const memberName = profile ? `${profile.first_name} ${profile.last_name ?? ""}`.trim() : "Un membre";
  const memberEmail = authUser?.data?.user?.email ?? "inconnu";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${getResendApiKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Agapeo <support@agapeo.love>",
        to: [getSupportEmail()],
        reply_to: memberEmail !== "inconnu" ? memberEmail : undefined,
        subject: `Support à reprendre · ${categorie} · ${memberName}`,
        html: buildAgapeoEmailHtml({
          title: "Dossier transmis par l'assistant",
          preheader: `${escapeHtml(memberName)} attend une réponse humaine`,
          eyebrow: "SUPPORT",
          headline: "L'assistant n'a pas pu régler ce cas",
          contentHtml: `<div style="background:#F4F6F8;border-radius:12px;padding:14px 16px;color:#334155;font-size:14px;line-height:1.6;white-space:pre-line;">${escapeHtml(resume)}</div>`,
          infoRows: [
            { label: "Membre", value: memberName },
            { label: "Email", value: memberEmail },
            { label: "Motif", value: categorie }
          ],
          ctaText: "Reprendre le dossier",
          ctaUrl: `${env.siteUrl}/admin/support?ticket=${ctx.ticketId}`
        })
      })
    });
    if (!res.ok) {
      // Le dossier est marqué en base : l'équipe le verra dans l'inbox même si
      // l'email n'est pas parti. On ne ment donc pas au membre.
      return {
        result: `TRANSMIS (dossier marqué pour l'équipe), mais l'email de notification a échoué : ${(await res.text()).slice(0, 200)}`,
        outcome: "APPLIED"
      };
    }
  } catch (err) {
    return {
      result: `TRANSMIS (dossier marqué pour l'équipe), mais l'email de notification a échoué : ${err instanceof Error ? err.message : "erreur réseau"}`,
      outcome: "APPLIED"
    };
  }

  return {
    result:
      "TRANSMIS à l'équipe (dossier marqué + email envoyé). Dis au membre qu'un humain de l'équipe reprend son dossier et lui " +
      "répondra ici même, dans cette conversation.",
    outcome: "APPLIED"
  };
}

// ---------------------------------------------------------------------------
// Définitions exposées au modèle
// ---------------------------------------------------------------------------

export const SUPPORT_AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "ouvrir_acces_apres_verification",
    description:
      "À utiliser quand le membre dit avoir payé sans avoir reçu son accès Premium. L'outil relit lui-même les paiements du membre " +
      "en base : il ouvre l'accès UNIQUEMENT s'il trouve un paiement réussi qui le justifie, et refuse en expliquant pourquoi sinon. " +
      "Tu ne peux pas forcer l'ouverture, et tu n'as pas à juger si le paiement est valable — l'outil le fait. Aucun paramètre : " +
      "il agit toujours sur le membre de cette conversation.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true
  },
  {
    name: "fix_birth_date",
    description:
      "Corrige la date de naissance du membre de cette conversation, après qu'il a confirmé la bonne date. Format AAAA-MM-JJ. " +
      "Refusé si la date donne moins de 18 ans ou plus de 100 ans, et au-delà de 2 corrections par 24 h.",
    input_schema: {
      type: "object",
      properties: { birth_date: { type: "string", description: "Date de naissance au format AAAA-MM-JJ." } },
      required: ["birth_date"],
      additionalProperties: false
    },
    strict: true
  },
  {
    name: "fix_gender",
    description:
      "Corrige le genre du membre de cette conversation, après confirmation explicite de sa part. Change les profils qui lui sont " +
      "proposés. Refusé au-delà de 2 corrections par 24 h.",
    input_schema: {
      type: "object",
      properties: { gender: { type: "string", enum: ["MALE", "FEMALE"], description: "MALE pour un homme, FEMALE pour une femme." } },
      required: ["gender"],
      additionalProperties: false
    },
    strict: true
  },
  {
    name: "transmettre_a_l_equipe",
    description:
      "Transmet le dossier à un membre humain de l'équipe : à utiliser dès que tu ne peux pas régler le problème toi-même " +
      "(compte suspendu, remboursement demandé, paiement introuvable alors que le membre affirme avoir payé, bug technique, " +
      "situation sensible, ou simplement si le membre demande à parler à quelqu'un). L'équipe répond ensuite dans cette même " +
      "conversation. Rédige un résumé utile : ce que le membre demande, ce que tu as déjà vérifié, et ce qui bloque.",
    input_schema: {
      type: "object",
      properties: {
        resume: { type: "string", description: "Résumé pour l'équipe : demande, vérifications déjà faites, point de blocage." },
        categorie: {
          type: "string",
          enum: ["PAIEMENT", "VERIFICATION", "COMPTE_SUSPENDU", "REMBOURSEMENT", "BUG", "AUTRE"],
          description: "Nature du dossier."
        }
      },
      required: ["resume", "categorie"],
      additionalProperties: false
    },
    strict: true
  }
];

export async function executeSupportTool(ctx: ToolCallContext, name: string, rawInput: unknown): Promise<ToolOutcome> {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  let outcome: ToolOutcome;

  try {
    switch (name) {
      case "ouvrir_acces_apres_verification":
        outcome = await openAccessIfPaid(ctx);
        break;
      case "fix_birth_date":
        outcome = await fixBirthDate(ctx, String(input.birth_date ?? ""));
        break;
      case "fix_gender":
        outcome = await fixGender(ctx, String(input.gender ?? ""));
        break;
      case "transmettre_a_l_equipe":
        outcome = await escalateToTeam(ctx, String(input.resume ?? ""), String(input.categorie ?? "AUTRE"));
        break;
      default:
        outcome = { result: `Outil inconnu : ${name}.`, outcome: "ERROR" };
    }
  } catch (err) {
    outcome = { result: `Échec technique : ${err instanceof Error ? err.message : "erreur inconnue"}`, outcome: "ERROR" };
  }

  await journalise(ctx, name, input, outcome);
  return outcome;
}

export { SYSTEM_ACCOUNT_ID };
