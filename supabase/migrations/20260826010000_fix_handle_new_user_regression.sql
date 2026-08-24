-- ============================================================================
-- Corrige une régression introduite par 20260825000000_meta_capi_lead_trigger.sql :
-- ce fichier redéfinissait handle_new_user() en repartant de sa toute première
-- version (20260808120100_functions_triggers.sql) au lieu de sa dernière
-- version réelle (20260813020000_oauth_nullable_identity_fields.sql), perdant
-- au passage deux correctifs :
--   1) l'insertion dans profile_restricted (rôle, statut d'abonnement...) —
--      absente depuis, tout nouveau compte créé entre le déploiement de cette
--      régression et ce correctif n'a AUCUNE ligne profile_restricted, ce qui
--      bloque silencieusement l'activation Premium (le webhook Chariow met à
--      jour une ligne qui n'existe pas) et fait échouer les nouvelles policies
--      RLS de 20260826000000 (leurs sous-requêtes sur profile_restricted
--      renvoient NULL) ;
--   2) le repli sur les métadonnées standard de Google OAuth (name/full_name)
--      pour le prénom, et le nullif() sur gender/birth_date/country (une
--      chaîne vide au lieu de NULL aurait fait échouer le cast ::gender_type).
-- Restaure la dernière version correcte, complétée par l'appel Meta CAPI.
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
    coalesce(
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), ''),
      ''
    ),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'gender', '')::gender_type,
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'country', ''),
    new.email_confirmed_at is not null
  );

  insert into public.profile_private (id) values (new.id);
  insert into public.profile_restricted (id) values (new.id);

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
