-- ============================================================================
-- Complète handle_new_user() : relaie l'évènement Meta Conversions API
-- "CompleteRegistration" (tag "prospect") au moment exact où le compte est
-- créé — même mécanisme que notify_push_on_notification/notify_first_message_email
-- (délégation à une Edge Function via pg_net, clé service_role lue depuis
-- Vault). Se déclenche exactement une fois par compte réel (AFTER INSERT
-- sur auth.users), que l'inscription vienne du flux email/mot de passe ou de
-- Google OAuth.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  service_role_key text;
begin
  insert into public.profiles (id, first_name, last_name, gender, birth_date, country, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    (new.raw_user_meta_data ->> 'gender')::gender_type,
    (new.raw_user_meta_data ->> 'birth_date')::date,
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    new.email_confirmed_at is not null
  );

  insert into public.profile_private (id) values (new.id);

  if new.email is not null then
    select decrypted_secret into service_role_key from vault.decrypted_secrets where name = 'service_role_key';
    if service_role_key is not null then
      perform net.http_post(
        url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/meta-capi-lead',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object('userId', new.id, 'email', new.email)
      );
    end if;
  end if;

  return new;
end;
$$;
