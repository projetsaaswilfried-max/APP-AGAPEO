-- ============================================================================
-- Corrige un doublon de push découvert en testant le changement précédent
-- (20260928010000_notify_every_message.sql) contre un vrai device_tokens :
-- `upsert_aggregated_notification` fait un INSERT (pas un UPDATE) à chaque
-- fois qu'une notification NEW_MESSAGE repart de zéro pour une conversation
-- (premier message, ou premier message après lecture) — et cet INSERT
-- déclenche AUSSI le trigger générique `notify_push_on_notification`, qui
-- pousse sur TOUT insert dans `notifications` sans distinction de type.
-- Résultat vérifié en réel : le destinataire recevait deux notifications
-- push pour un seul message (une du trigger dédié aux messages
-- `notify_push_on_new_message`, une du trigger générique).
--
-- Les messages sont déjà intégralement couverts par le trigger dédié
-- (20260925020000_push_per_message.sql, un push par message quel que soit
-- son rang) — le trigger générique n'a donc plus besoin de pousser pour ce
-- type, seulement d'insérer la ligne pour la cloche.
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
      'targetUrl', new.target_url
    )
  );

  return new;
end;
$$;
