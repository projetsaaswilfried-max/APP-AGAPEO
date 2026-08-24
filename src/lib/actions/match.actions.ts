"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMatchAcceptedEmail } from "@/lib/match-emails";
import type { MatchRow } from "@/lib/supabase/database.types";

/**
 * `matches.status -> ACCEPTED/CANCELLED` fait basculer `profiles.is_matched`
 * via le trigger `sync_profiles_is_matched` (SECURITY DEFINER). Mais ce
 * trigger met à jour `profiles`, une colonne protégée par
 * `protect_privileged_profile_columns()` qui regarde `auth.uid()` — lequel
 * reflète toujours le JWT de la requête d'origine, peu importe le SECURITY
 * DEFINER de la fonction appelante. Écrire `matches` avec le client
 * authentifié classique ferait donc échouer la cascade. Toutes les écritures
 * sur `matches` passent donc par le client service_role, après vérification
 * explicite des droits via le client authentifié normal.
 */

async function getSessionUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id };
}

type MatchActionResult = { error: string } | { success: true };

/** Propose un match depuis une conversation déjà acceptée. Notifie le destinataire. */
export async function requestMatchAction(conversationId: string): Promise<{ error: string } | { success: true; matchId: string }> {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) return { error: "Session expirée, reconnecte-toi." };

  const { data: conversation } = await supabase.from("conversations").select("status").eq("id", conversationId).maybeSingle();
  if (!conversation || conversation.status !== "ACCEPTED") {
    return { error: "Cette conversation doit être acceptée avant de proposer un match." };
  }

  const { data: participants } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conversationId);
  const otherId = (participants ?? []).map((p) => p.user_id).find((id) => id !== userId);
  if (!otherId) return { error: "Conversation introuvable." };

  const { data: profiles } = await supabase.from("profiles").select("id, first_name, is_matched").in("id", [userId, otherId]);
  const me = profiles?.find((p) => p.id === userId);
  const other = profiles?.find((p) => p.id === otherId);
  if (me?.is_matched || other?.is_matched) {
    return { error: "Un des deux profils est déjà en couple sur Agapeo." };
  }

  const { data: existing } = await supabase
    .from("matches")
    .select("status")
    .eq("conversation_id", conversationId)
    .in("status", ["PENDING", "ACCEPTED"])
    .maybeSingle();
  if (existing) {
    return { error: existing.status === "ACCEPTED" ? "Vous êtes déjà en couple." : "Une demande de match est déjà en cours." };
  }

  const admin = createAdminClient();
  const { data: match, error } = await admin
    .from("matches")
    .insert({ conversation_id: conversationId, requester_id: userId, recipient_id: otherId })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Une demande de match est déjà en cours pour cette conversation." };
    return { error: "Impossible de proposer le match pour le moment." };
  }

  await admin.from("notifications").insert({
    recipient_id: otherId,
    actor_id: userId,
    type: "MATCH_REQUEST",
    title: `${me?.first_name ?? "Un membre"} propose de matcher avec toi`,
    body: "Rendez-vous dans votre conversation pour répondre à la demande.",
    target_url: `/messages?conversation=${conversationId}`
  });

  revalidatePath("/messages");
  return { success: true, matchId: (match as MatchRow).id };
}

/** Réponse du destinataire à une demande de match — envoie l'email de félicitations aux deux membres si acceptée. */
export async function respondToMatchAction(matchId: string, accept: boolean): Promise<MatchActionResult> {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) return { error: "Session expirée, reconnecte-toi." };

  const { data: matchData } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  const match = matchData as MatchRow | null;
  if (!match) return { error: "Demande de match introuvable." };
  if (match.status !== "PENDING") return { error: "Cette demande n'est plus en attente." };
  if (match.recipient_id !== userId) return { error: "Seul le destinataire peut répondre à cette demande." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("matches")
    .update(
      accept
        ? { status: "ACCEPTED", responded_at: new Date().toISOString() }
        : { status: "CANCELLED", responded_at: new Date().toISOString(), cancelled_at: new Date().toISOString(), cancelled_by: userId }
    )
    .eq("id", matchId);
  if (error) return { error: "Impossible d'enregistrer la réponse." };

  if (accept) {
    const { data: profiles } = await admin.from("profiles").select("id, first_name").in("id", [match.requester_id, match.recipient_id]);
    const requesterProfile = profiles?.find((p) => p.id === match.requester_id);
    const recipientProfile = profiles?.find((p) => p.id === match.recipient_id);

    await admin.from("notifications").insert({
      recipient_id: match.requester_id,
      actor_id: match.recipient_id,
      type: "MATCH_ACCEPTED",
      title: "Ton match a été accepté !",
      body: "Vous êtes désormais en couple sur Agapeo — félicitations !",
      target_url: `/messages?conversation=${match.conversation_id}`
    });

    const [{ data: requesterAuth }, { data: recipientAuth }] = await Promise.all([
      admin.auth.admin.getUserById(match.requester_id),
      admin.auth.admin.getUserById(match.recipient_id)
    ]);

    if (requesterProfile && requesterAuth?.user?.email) {
      await sendMatchAcceptedEmail(requesterAuth.user.email, requesterProfile.first_name, recipientProfile?.first_name ?? "ton/ta partenaire");
    }
    if (recipientProfile && recipientAuth?.user?.email) {
      await sendMatchAcceptedEmail(recipientAuth.user.email, recipientProfile.first_name, requesterProfile?.first_name ?? "ton/ta partenaire");
    }
  }

  revalidatePath("/messages");
  return { success: true };
}

/** Annule un match (en attente ou déjà en couple) — accessible aux deux membres. Libère `is_matched` si le match était ACCEPTED. */
export async function cancelMatchAction(matchId: string): Promise<MatchActionResult> {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) return { error: "Session expirée, reconnecte-toi." };

  const { data: matchData } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  const match = matchData as MatchRow | null;
  if (!match) return { error: "Match introuvable." };
  if (match.requester_id !== userId && match.recipient_id !== userId) return { error: "Action non autorisée." };
  if (match.status === "CANCELLED") return { error: "Ce match est déjà annulé." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("matches")
    .update({ status: "CANCELLED", cancelled_at: new Date().toISOString(), cancelled_by: userId })
    .eq("id", matchId);
  if (error) return { error: "Impossible d'annuler le match." };

  revalidatePath("/messages");
  return { success: true };
}

/** Match actif (PENDING ou ACCEPTED) pour une conversation, ou `null` — pour afficher la bannière adéquate côté UI. */
export async function getMatchForConversationAction(conversationId: string): Promise<MatchRow | null> {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("conversation_id", conversationId)
    .in("status", ["PENDING", "ACCEPTED"])
    .maybeSingle();

  return data as MatchRow | null;
}
