-- ============================================================================
-- Deux correctifs signales en verifiant le format des push avec le dev
-- mobile :
--
-- 1. Le champ generique `notification` (title/body) de l'API FCM ne porte
--    aucun son -- sans bloc specifique par plateforme, la notification
--    s'affiche mais reste muette. Ajoute dans send-push-notification/index.ts
--    (android.notification.sound + apns.payload.aps.sound = "default").
--
-- 2. Le `type` de la notification (NEW_MESSAGE, PHOTO_APPROVED...) n'etait
--    jamais transmis dans le payload push -- le mobile ne pouvait donc pas
--    router differemment selon le type, contrairement a la liste in-app qui
--    l'affiche. Les deux triggers ci-dessous l'ajoutent desormais, en
--    reprenant exactement la meme valeur que `notifications.type` (jamais
--    reformatee) pour que mobile et web restent alignes sur le meme enum.
-- ============================================================================

create or replace function notify_push_on_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  service_role_key text;
begin
  if new.type = 'NEW_MESSAGE' then
    return new;
  end if;

  select decrypted_secret into service_role_key from vault.decrypted_secrets where name = 'service_role_key';
  if service_role_key is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'recipientId', new.recipient_id,
      'title', new.title,
      'body', new.body,
      'targetUrl', new.target_url,
      'type', new.type
    )
  );

  return new;
end;
$$;

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
          'targetUrl', '/messages?conversation=' || new.conversation_id,
          'type', 'NEW_MESSAGE'
        )
      );
    end if;
  end loop;

  return new;
end;
$$;
