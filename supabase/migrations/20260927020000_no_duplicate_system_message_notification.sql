-- ============================================================================
-- Bug trouve en testant l'envoi en masse de l'annonce v2.2 : sendAgapeoSystemMessage
-- (deja utilisee en prod pour le message de bienvenue a la verification et les
-- relances Premium) insere elle-meme une notification explicite pour CHAQUE
-- message systeme envoye (voulu : elle ignore delibalement notify_messages,
-- car c'est une communication d'activation/monetisation, pas un message entre
-- membres). Mais depuis le correctif du 2026-09-28 (notify_every_message),
-- notify_new_message() cree DESORMAIS AUSSI sa propre notification pour
-- CHAQUE message, y compris ceux envoyes par le compte systeme "Equipe
-- Agapeo" -- resultat : deux notifications NEW_MESSAGE pour un seul message
-- systeme, verifie en reel (compte jetable).
--
-- Avant ce correctif de 2026-09-28, notify_new_message() ne notifiait que le
-- premier message d'une conversation, donc ce doublon n'apparaissait que
-- pour LE TOUT PREMIER message systeme envoye a chaque membre (le message de
-- bienvenue) -- desormais systematique a chaque message.
--
-- Correctif : notify_new_message() ignore desormais les messages envoyes par
-- le compte systeme (deja notifies explicitement par sendAgapeoSystemMessage,
-- qui a le bon comportement voulu vis-a-vis de notify_messages) -- la
-- logique de messages entre membres reste totalement inchangee.
-- ============================================================================

create or replace function notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  message_preview text;
  recipient record;
begin
  if new.sender_id = '8d736a66-2597-4f48-b70b-08e6f7059c89' then
    return new;
  end if;

  select first_name into sender_name from profiles where id = new.sender_id;

  message_preview := case
    when new.type = 'TEXT' then left(coalesce(new.content, ''), 140)
    when new.type = 'IMAGE' then 'A envoyé une photo'
    when new.type = 'VIDEO' then 'A envoyé une vidéo'
    when new.type = 'DOCUMENT' then 'A envoyé un document'
    when new.type = 'VOICE' then 'A envoyé un message vocal'
    else ''
  end;

  for recipient in
    select cp.user_id, p.notify_messages
    from conversation_participants cp
    join profiles p on p.id = cp.user_id
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    if recipient.notify_messages then
      perform upsert_aggregated_notification(
        recipient.user_id,
        new.sender_id,
        'NEW_MESSAGE',
        '/messages?conversation=' || new.conversation_id,
        coalesce(sender_name, 'Quelqu''un') || ' vous a envoyé un message',
        coalesce(sender_name, 'Quelqu''un') || ' vous a envoyé %s messages',
        message_preview
      );
    end if;
  end loop;

  return new;
end;
$$;
