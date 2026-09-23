-- ============================================================================
-- Push mobile à CHAQUE nouveau message, indépendamment de la cloche de
-- notifications in-app (`notify_new_message`, volontairement limitée au
-- premier message d'une conversation pour ne pas noyer le centre de
-- notifications d'un échange actif — cf. son commentaire d'origine). Une
-- vraie messagerie doit pousser une notification à chaque message quand le
-- destinataire n'a pas l'app ouverte ; ce trigger est donc séparé et
-- n'insère jamais dans `notifications`, il appelle directement
-- send-push-notification pour chaque message, quel que soit son rang dans
-- la conversation.
--
-- Suppression de la bannière quand le destinataire a déjà cette conversation
-- ouverte à l'écran : ce n'est pas décidable ici (le serveur ne sait pas ce
-- qui est affiché sur l'appareil) — c'est le rôle de l'app mobile elle-même
-- (gestionnaire FCM en premier plan côté client), comme WhatsApp/Messenger.
-- ============================================================================

create or replace function notify_push_on_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  recipient record;
  service_role_key text;
  push_title text;
  push_body text;
begin
  select decrypted_secret into service_role_key from vault.decrypted_secrets where name = 'service_role_key';
  if service_role_key is null then
    return new;
  end if;

  select first_name into sender_name from profiles where id = new.sender_id;

  push_title := coalesce(sender_name, 'Quelqu''un') || ' vous a envoyé un message';
  push_body := case
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
      perform net.http_post(
        url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'recipientId', recipient.user_id,
          'title', push_title,
          'body', push_body,
          'targetUrl', '/messages?conversation=' || new.conversation_id
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger messages_send_push_every_message
  after insert on messages
  for each row execute function notify_push_on_new_message();
