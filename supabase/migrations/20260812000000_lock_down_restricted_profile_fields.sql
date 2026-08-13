-- ============================================================================
-- Correctif de sécurité : `role`, le statut de suspension, l'abonnement et la
-- géolocalisation vivaient dans `profiles` — la même table que les champs de
-- profil publics. RLS de Postgres filtre par LIGNE, jamais par COLONNE : dès
-- qu'un membre a le droit de lire la fiche d'un autre (Découvrir, messagerie,
-- fil, profils publics), son navigateur reçoit TOUTES les colonnes de cette
-- ligne, y compris ces champs jamais destinés à un autre membre — exactement
-- le même risque qui a motivé l'isolement du téléphone dans `profile_private`
-- (cf. schema.sql). On applique ici le même principe à ces colonnes.
--
-- `is_test_account` reste volontairement dans `profiles` : c'est un simple
-- indicateur opérationnel (pas une donnée privée d'un membre réel), et il est
-- déjà lu par plusieurs scripts/Edge Functions — le déplacer n'apporterait
-- aucun bénéfice de confidentialité pour un coût de migration réel.
-- ============================================================================

create table profile_restricted (
  id uuid primary key references profiles (id) on delete cascade,
  role app_role not null default 'USER',
  is_suspended boolean not null default false,
  suspended_at timestamptz,
  suspended_reason text,
  subscription_status subscription_status not null default 'FREE',
  subscription_plan text,
  subscription_current_period_end timestamptz,
  latitude double precision,
  longitude double precision
);

insert into profile_restricted (id, role, is_suspended, suspended_at, suspended_reason, subscription_status, subscription_plan, subscription_current_period_end, latitude, longitude)
select id, role, is_suspended, suspended_at, suspended_reason, subscription_status, subscription_plan, subscription_current_period_end, latitude, longitude
from profiles;

-- Badge public "réponse de l'équipe" (déjà affiché sur les commentaires,
-- cf. feed.mapper.ts::isOfficialResponse) : contrairement au rôle exact
-- (USER/MODERATOR/ADMIN/SUPER_ADMIN, qui reste privé), le simple fait
-- qu'un membre appartienne à l'équipe est une information publique légitime
-- (comparable à un badge "vérifié") — on la garde donc sur `profiles` sous
-- une forme réduite, synchronisée automatiquement depuis `profile_restricted`.
alter table profiles add column is_staff boolean not null default false;

update profiles p set is_staff = (pr.role <> 'USER')
from profile_restricted pr
where pr.id = p.id;

create function sync_profile_is_staff()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update profiles set is_staff = (new.role <> 'USER') where id = new.id;
  return new;
end;
$$;

create trigger profile_restricted_sync_is_staff
  after insert or update of role on profile_restricted
  for each row execute function sync_profile_is_staff();

-- Colonnes déplacées : plus besoin de l'ancien index dédié ni de la colonne
-- elle-même sur `profiles` (les autres index sur `profiles` sont indépendants).
drop index if exists profiles_is_suspended_idx;
drop index if exists profiles_subscription_status_idx;

alter table profiles
  drop column role,
  drop column is_suspended,
  drop column suspended_at,
  drop column suspended_reason,
  drop column subscription_status,
  drop column subscription_plan,
  drop column subscription_current_period_end,
  drop column latitude,
  drop column longitude;

create index profile_restricted_is_suspended_idx on profile_restricted (is_suspended) where is_suspended;
create index profile_restricted_subscription_status_idx on profile_restricted (subscription_status);

-- ----------------------------------------------------------------------------
-- RLS — lisible uniquement par son propriétaire (comme `profile_private`) ;
-- AUCUNE policy d'écriture pour authenticated/anon : toutes les mutations de
-- rôle/suspension/abonnement passent déjà exclusivement par le client
-- service_role (cf. admin.actions.ts) — reproduire ici une policy "update own"
-- comme celle de `profile_private` réintroduirait une auto-élévation de
-- privilège (un membre pourrait s'attribuer SUPER_ADMIN via une requête PATCH
-- directe sur la table).
-- ----------------------------------------------------------------------------
alter table profile_restricted enable row level security;

create policy profile_restricted_select_own on profile_restricted
  for select to authenticated
  using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- `is_admin_or_moderator()` et le trigger de garde des colonnes privilégiées
-- doivent maintenant lire `role` depuis sa nouvelle table.
-- ----------------------------------------------------------------------------
create or replace function is_admin_or_moderator(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role in ('ADMIN', 'SUPER_ADMIN', 'MODERATOR') from profile_restricted where id = uid),
    false
  );
$$;

-- `role` n'existe plus sur `profiles` : le trigger ne garde plus que les
-- statuts de vérification (email/téléphone/photo), toujours publics mais
-- toujours interdits en auto-modification.
create or replace function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.email_verified is distinct from old.email_verified
    or new.phone_verified is distinct from old.phone_verified
    or new.photo_verification_status is distinct from old.photo_verification_status then
    raise exception 'Modification des statuts de vérification non autorisée';
  end if;

  return new;
end;
$$;

-- `handle_new_user()` doit désormais créer aussi la ligne `profile_restricted`
-- (valeurs par défaut suffisantes : USER / non suspendu / FREE).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
  insert into public.profile_restricted (id) values (new.id);

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Correctif additionnel du même audit : `transactions` n'avait aucune policy
-- de lecture pour `authenticated` (verrouillée service_role uniquement, cf.
-- billing_and_campaigns.sql) — ce qui empêchait par erreur un membre de lire
-- SES PROPRES transactions (utilisé par exportMyDataAction). Ajout sûr et
-- additif : ne fait qu'autoriser un membre à lire ses propres lignes.
-- ----------------------------------------------------------------------------
create policy transactions_select_own on transactions
  for select to authenticated
  using (user_id = auth.uid());
