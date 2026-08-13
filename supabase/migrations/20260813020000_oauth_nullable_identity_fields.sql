-- ============================================================================
-- Connexion Google (OAuth) : contrairement à l'inscription email/mot de passe
-- (RegisterSchema), le fournisseur OAuth ne transmet jamais `gender` ni
-- `birth_date` dans ses métadonnées, et rarement `country`. Ces 3 colonnes
-- étaient NOT NULL sans défaut : la création du compte échouait purement et
-- simplement (le trigger `handle_new_user` levait une erreur NOT NULL en
-- tentant d'insérer NULL). On les rend nullable ; l'onboarding se charge de
-- les collecter dans ce cas précis via une étape dédiée (cf.
-- onboarding-essential-info-step.tsx), avant que ces champs ne redeviennent
-- volontairement non-éditables (cf. ProfileEditableSchema).
-- ============================================================================

alter table profiles alter column gender drop not null;
alter table profiles alter column birth_date drop not null;
alter table profiles alter column country drop not null;

-- `handle_new_user` : ne plus supposer que ces clés existent dans
-- raw_user_meta_data (vrai uniquement pour l'inscription email/mot de passe).
-- Ajout d'un repli sur les métadonnées standard fournies par Google OAuth
-- (`name`/`full_name`) pour le prénom quand `first_name` est absent.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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

  return new;
end;
$$;
