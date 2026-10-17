"use server";

import { requireSession } from "@/lib/supabase/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Annule une invitation à discuter que le membre a lui-même envoyée, tant
 * qu'elle n'a pas reçu de réponse. La RLS ne laisse que le DESTINATAIRE
 * modifier une invitation (conversations_respond_to_invite) : on passe donc
 * par le client service-role, après avoir vérifié ici que l'appelant est
 * bien l'expéditeur et que l'invitation est toujours en attente. La
 * conversation est supprimée (participants, messages et match suivent par
 * cascade), ainsi que la notification "souhaite discuter avec toi" reçue par
 * l'autre membre — l'invitation disparaît comme si elle n'avait jamais existé.
 */
export async function cancelInvitationAction(conversationId: string): Promise<{ error?: string }> {
  const { user } = await requireSession();
  const admin = createAdminClient();

  const { data: conversation } = await admin
    .from("conversations")
    .select("id, status, initiated_by")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || conversation.initiated_by !== user.id) return { error: "Invitation introuvable." };
  if (conversation.status !== "PENDING") return { error: "Cette invitation a déjà reçu une réponse." };

  await admin.from("notifications").delete().eq("type", "CONVERSATION_INVITE").eq("target_url", `/messages?conversation=${conversationId}`);

  // Garde "PENDING" répétée dans la suppression : si l'autre membre accepte à la même seconde, rien n'est supprimé.
  const { error } = await admin.from("conversations").delete().eq("id", conversationId).eq("status", "PENDING");
  if (error) return { error: "Impossible d'annuler l'invitation." };
  return {};
}
