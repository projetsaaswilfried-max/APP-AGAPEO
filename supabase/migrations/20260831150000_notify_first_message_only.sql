-- ============================================================================
-- Une notification "nouveau message" était envoyée pour CHAQUE message
-- échangé - remonté par le fondateur comme ressemblant à du spam, en plus de
-- faire doublon avec le badge de non-lu de la messagerie elle-même.
--
-- Nouveau comportement voulu (les deux premières notifications existent déjà
-- via d'autres triggers, non touchés ici) :
--   - Invitation reçue (CONVERSATION_INVITE)               -> déjà en place
--   - Invitation acceptée (CONVERSATION_ACCEPTED)           -> déjà en place
--   - Premier VRAI message d'une conversation (NEW_MESSAGE) -> notifié
--   - Tous les messages suivants                            -> plus notifiés
-- ============================================================================

create or replace function notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  recipient record;
  is_first_message boolean;
begin
  select not exists (
    select 1 from messages m where m.conversation_id = new.conversation_id and m.id <> new.id
  ) into is_first_message;

  if not is_first_message then
    return new;
  end if;

  select first_name into sender_name from profiles where id = new.sender_id;

  for recipient in
    select cp.user_id, p.notify_messages
    from conversation_participants cp
    join profiles p on p.id = cp.user_id
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    if recipient.notify_messages then
      insert into notifications (recipient_id, actor_id, type, title, body, target_url)
      values (
        recipient.user_id,
        new.sender_id,
        'NEW_MESSAGE',
        sender_name || ' vous a envoyé un message',
        case
          when new.type = 'TEXT' then left(coalesce(new.content, ''), 140)
          when new.type = 'IMAGE' then 'A envoyé une photo'
          when new.type = 'VIDEO' then 'A envoyé une vidéo'
          when new.type = 'DOCUMENT' then 'A envoyé un document'
          when new.type = 'VOICE' then 'A envoyé un message vocal'
          else ''
        end,
        '/messages?conversation=' || new.conversation_id
      );
    end if;
  end loop;

  return new;
end;
$$;
