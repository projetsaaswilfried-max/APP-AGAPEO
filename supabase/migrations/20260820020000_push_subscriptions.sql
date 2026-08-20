-- ============================================================================
-- Notifications push (type WhatsApp) : un membre peut avoir plusieurs
-- abonnements (un par appareil/navigateur). RLS : chacun ne gère que ses
-- propres abonnements. Le déclenchement se fait sur `notifications` elle-même
-- (AFTER INSERT) : chaque type de notification passe déjà par les préférences
-- existantes (notify_messages, notify_likes, etc.) avant qu'une ligne y soit
-- insérée, donc le push hérite gratuitement des mêmes préférences que l'email.
-- ============================================================================

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_select_own on push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_insert_own on push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_delete_own on push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

create function notify_push_on_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  service_role_key text;
begin
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

create trigger notifications_send_push
  after insert on notifications
  for each row execute function notify_push_on_notification();
