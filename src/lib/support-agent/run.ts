import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { loadMemberDossier, renderDossier } from "./context";
import { buildSystemBlocks } from "./prompt";
import { SUPPORT_AGENT_TOOLS, executeSupportTool, type ToolCallContext } from "./tools";

/**
 * Boucle de l'assistant de support : on garde la main sur la boucle plutôt que
 * d'utiliser l'assistant automatique du SDK, parce que chaque appel d'outil
 * doit passer par `executeSupportTool`, qui autorise, plafonne et journalise.
 * C'est le code qui décide si l'action est permise, jamais le modèle.
 */

/** Modèle par défaut : le plus capable de la gamme. Surchargeable sans redéploiement. */
const MODEL = process.env.SUPPORT_AGENT_MODEL || "claude-opus-5-5";
/**
 * `medium` est le défaut de ce modèle : assez pour raisonner sur un dossier de
 * paiement, sans la latence des niveaux supérieurs dans une conversation.
 */
const EFFORT = (process.env.SUPPORT_AGENT_EFFORT || "medium") as "low" | "medium" | "high";
/**
 * Un tour = un appel au modèle. Au-delà, on transmet à l'équipe plutôt que de
 * boucler. Volontairement bas : la route dispose de 60 s au total, et un tour
 * qui n'aboutit pas en quatre étapes relève de l'équipe, pas d'un acharnement.
 */
const MAX_TURNS = 4;
/** Au-delà, on tronque : un dossier de support n'a pas besoin de tout son passé. */
const MAX_HISTORY_MESSAGES = 30;

export interface SupportAgentTurn {
  role: "member" | "agent";
  content: string;
}

export interface SupportAgentResult {
  reply: string;
  /** Outils réellement exécutés, pour le journal côté appelant. */
  toolsUsed: string[];
  escalated: boolean;
}

export class SupportAgentUnavailableError extends Error {}

/**
 * Message de repli quand l'assistant ne peut pas répondre (clé absente, API en
 * erreur, refus de sécurité). Il ne faut JAMAIS laisser un membre sans réponse :
 * l'appelant transmet alors le dossier à l'équipe.
 */
export const FALLBACK_REPLY =
  "Je ne parviens pas à traiter ta demande à l'instant. Je viens de transmettre ton dossier à l'équipe : " +
  "quelqu'un te répond ici même dès que possible. Désolé pour l'attente.";

function toMessages(history: SupportAgentTurn[]): Anthropic.Beta.BetaMessageParam[] {
  const trimmed = history.slice(-MAX_HISTORY_MESSAGES);
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of trimmed) {
    if (!turn.content.trim()) continue;
    messages.push({ role: turn.role === "member" ? "user" : "assistant", content: turn.content });
  }
  // L'API exige un premier message `user` : si l'historique commence par une
  // prise de contact de l'équipe, on la retire plutôt que d'échouer.
  while (messages.length > 0 && messages[0].role === "assistant") messages.shift();
  return messages;
}

function extractText(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function runSupportAgent(ctx: ToolCallContext, history: SupportAgentTurn[]): Promise<SupportAgentResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new SupportAgentUnavailableError("ANTHROPIC_API_KEY n'est pas configurée.");
  }

  const dossier = await loadMemberDossier(ctx.userId);
  if (!dossier) throw new SupportAgentUnavailableError("Dossier du membre introuvable.");

  const client = new Anthropic();
  const messages = toMessages(history);
  if (messages.length === 0) throw new SupportAgentUnavailableError("Aucun message du membre à traiter.");

  const system = buildSystemBlocks(renderDossier(dossier));
  const toolsUsed: string[] = [];
  let escalated = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Repli serveur : si un classificateur de sécurité décline la requête,
      // l'API la rejoue sur un autre modèle dans le même appel au lieu de
      // laisser le membre sans réponse.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      system,
      tools: SUPPORT_AGENT_TOOLS,
      messages
    });

    // `stop_reason` se lit TOUJOURS avant le contenu : un refus renvoie un 200.
    if (response.stop_reason === "refusal") {
      throw new SupportAgentUnavailableError(`Requête déclinée par la sécurité du modèle (${response.stop_details?.category ?? "sans catégorie"}).`);
    }

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "tool_use") {
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const outcome = await executeSupportTool(ctx, block.name, block.input);
        toolsUsed.push(block.name);
        if (block.name === "transmettre_a_l_equipe" && outcome.outcome === "APPLIED") escalated = true;
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: outcome.result,
          is_error: outcome.outcome === "ERROR"
        });
      }
      // Tous les résultats dans UN seul message utilisateur : les séparer
      // apprend au modèle à ne plus paralléliser ses appels.
      messages.push({ role: "user", content: results });
      continue;
    }

    const reply = extractText(response.content);
    if (!reply) throw new SupportAgentUnavailableError("Réponse vide du modèle.");
    return { reply, toolsUsed, escalated };
  }

  // Trop de tours : on ne boucle pas indéfiniment, on passe la main.
  const handover = await executeSupportTool(ctx, "transmettre_a_l_equipe", {
    resume: "L'assistant a enchaîné trop d'étapes sans aboutir sur cette demande. Dossier à reprendre manuellement.",
    categorie: "AUTRE"
  });
  return {
    reply:
      "Je n'arrive pas à régler ça tout seul. J'ai transmis ton dossier à l'équipe : quelqu'un te répond ici même dès que possible.",
    toolsUsed: [...toolsUsed, "transmettre_a_l_equipe"],
    escalated: handover.outcome === "APPLIED"
  };
}
