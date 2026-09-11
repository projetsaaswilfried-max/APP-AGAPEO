import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { AGAPEO_SYSTEM_PROFILE_ID } from "@/domain/system-account";

/**
 * Envoie un message automatique au nom d'Agapeo dans une conversation dédiée
 * à sens unique (le membre peut lire mais pas répondre, cf. `is_system_broadcast`
 * dans messages/page.tsx) — réutilisée si elle existe déjà pour ce membre,
 * créée sinon (même principe que openReportConversationAction réutilisant un
 * ticket déjà ouvert plutôt que d'en créer un second). Toujours via le client
 * service-role : `conversations_insert`/`messages_insert` exigent un abonnement
 * ACTIF, ce qui bloquerait précisément les membres gratuits qu'on veut cibler.
 *
 * Insère aussi sa propre notification : le trigger `notify_new_message()` ne
 * notifie que le tout premier message d'une conversation (anti-spam), donc
 * les relances suivantes dans cette même conversation resteraient invisibles
 * sans cet insert explicite. Ignore volontairement `profiles.notify_messages`
 * — communication d'activation/monétisation, pas un message entre membres,
 * même logique que la séquence email qui ignore déjà notify_email_digest.
 */
export async function sendAgapeoSystemMessage(
  admin: ReturnType<typeof createAdminClient>,
  memberId: string,
  content: string
): Promise<void> {
  const { data: existingParticipant } = await admin
    .from("conversation_participants")
    .select("conversation_id, conversations!inner(is_system_broadcast)")
    .eq("user_id", memberId)
    .eq("conversations.is_system_broadcast", true)
    .maybeSingle();

  let conversationId: string;
  if (existingParticipant) {
    conversationId = existingParticipant.conversation_id;
  } else {
    const { data: newConversation, error: conversationError } = await admin
      .from("conversations")
      .insert({ is_system_broadcast: true, status: "ACCEPTED" })
      .select("id")
      .single();
    if (conversationError || !newConversation) {
      throw new Error(conversationError?.message ?? "Impossible de créer la conversation système Agapeo.");
    }
    conversationId = newConversation.id;

    const { error: participantsError } = await admin.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: memberId },
      { conversation_id: conversationId, user_id: AGAPEO_SYSTEM_PROFILE_ID }
    ]);
    if (participantsError) throw new Error(participantsError.message);
  }

  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "TEXT",
    content
  });
  if (messageError) throw new Error(messageError.message);

  await admin.from("notifications").insert({
    recipient_id: memberId,
    actor_id: AGAPEO_SYSTEM_PROFILE_ID,
    type: "NEW_MESSAGE",
    title: "Agapeo vous a envoyé un message",
    body: content.slice(0, 140),
    target_url: `/messages?conversation=${conversationId}`
  });
}
