-- Email "premier message" : quand un message est le tout premier échangé
-- dans une conversation, on notifie le destinataire par email (en plus de la
-- notification in-app déjà envoyée par notify_new_message) pour l'inciter à
-- se connecter et répondre. Un trigger PL/pgSQL ne peut pas appeler l'API
-- Resend directement (pas d'accès HTTP sortant natif) — on délègue donc à
-- une Edge Function via pg_net, même mécanisme que les crons existants
-- (weekly-digest, subscription-expiry), mais ici en appel synchrone déclenché
-- par un insert plutôt que par une planification.
create function notify_first_message_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  message_count int;
  recipient_id uuid;
  service_role_key text;
begin
  select count(*) into message_count from messages where conversation_id = new.conversation_id;
  if message_count <> 1 then
    return new;
  end if;

  select cp.user_id into recipient_id
  from conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id
  limit 1;

  if recipient_id is null then
    return new;
  end if;

  select decrypted_secret into service_role_key from vault.decrypted_secrets where name = 'service_role_key';
  if service_role_key is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/notify-first-message',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'recipientId', recipient_id,
      'senderId', new.sender_id,
      'conversationId', new.conversation_id
    )
  );

  return new;
end;
$$;

create trigger messages_notify_first_message_email
  after insert on messages
  for each row execute function notify_first_message_email();
