-- ============================================================================
-- Une notification (in-app, donc cloche + push par le circuit générique) à
-- CHAQUE message, plus seulement au premier d'une conversation. La cloche
-- ne "se noiera" pas pour autant : on réutilise `upsert_aggregated_notification`
-- (déjà en place pour favoris/likes/consultations) — tant que la précédente
-- notification de ce type pour cette conversation n'a pas été lue, un nouveau
-- message la met à jour ("Prénom vous a envoyé 3 messages") au lieu d'en
-- créer une par message ; dès qu'elle est lue, le message suivant repart sur
-- une notification neuve.
--
-- Le push par message, lui, reste géré par le trigger séparé
-- notify_push_on_new_message() (20260925020000_push_per_message.sql), sans
-- changement : `notifications_send_push` ne se déclenche qu'à l'INSERT
-- (jamais à l'UPDATE), donc le laisser brancher sur CE trigger-ci enverrait
-- un push pour le 1er message d'une rafale mais pas les suivants, une fois
-- agrégés — le trigger dédié garantit un push par message quoi qu'il arrive.
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
