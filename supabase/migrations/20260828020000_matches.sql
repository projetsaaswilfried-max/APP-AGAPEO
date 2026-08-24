-- ============================================================================
-- Système de matching : depuis une conversation acceptée, l'un des deux
-- membres peut proposer un "match" ; l'autre doit l'accepter. Une fois
-- accepté, les deux profils deviennent exclus de Découvrir pour tout le
-- monde (is_matched, synchronisé automatiquement, même principe que
-- is_premium/is_staff) — jusqu'à ce que l'un des deux annule le match.
-- ============================================================================

create type match_status as enum ('PENDING', 'ACCEPTED', 'CANCELLED');

create table matches (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  requester_id uuid not null references profiles (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  status match_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references profiles (id) on delete set null,
  constraint matches_distinct_users check (requester_id <> recipient_id)
);

create index matches_conversation_idx on matches (conversation_id);
create index matches_requester_idx on matches (requester_id);
create index matches_recipient_idx on matches (recipient_id);

-- Une seule demande active (en attente ou acceptée) à la fois par paire,
-- indépendamment de qui a initié — normalise l'ordre des deux id pour que
-- (A,B) et (B,A) comptent comme la même paire.
create unique index matches_active_pair_idx on matches (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('PENDING', 'ACCEPTED');

alter table matches enable row level security;

-- Badge public "en couple" — même principe que is_premium/is_staff : dérivé
-- de matches, jamais éditable directement par un membre. Ajoutée ici, avant
-- les policies matches_insert ci-dessous qui la référencent.
alter table profiles add column is_matched boolean not null default false;

create policy matches_select on matches
  for select to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

-- Impossible de proposer un match si l'un des deux est déjà matché ailleurs —
-- l'exclusivité du couple est une garantie, pas seulement une convention d'UI.
create policy matches_insert on matches
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = matches.conversation_id and cp.user_id = auth.uid()
    )
    and exists (select 1 from conversations c where c.id = matches.conversation_id and c.status = 'ACCEPTED')
    and not exists (
      select 1 from profiles p where p.id in (matches.requester_id, matches.recipient_id) and p.is_matched
    )
  );

-- Seul le destinataire de la demande peut l'accepter ; l'un ou l'autre peut
-- annuler (que ce soit une demande encore en attente ou déjà acceptée).
create policy matches_update on matches
  for update to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid())
  with check (
    (status = 'ACCEPTED' and recipient_id = auth.uid())
    or (status = 'CANCELLED' and (requester_id = auth.uid() or recipient_id = auth.uid()))
  );

create function sync_profiles_is_matched()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'ACCEPTED' and (TG_OP = 'INSERT' or old.status is distinct from 'ACCEPTED') then
    update profiles set is_matched = true where id in (new.requester_id, new.recipient_id);
  elsif TG_OP = 'UPDATE' and old.status = 'ACCEPTED' and new.status = 'CANCELLED' then
    update profiles set is_matched = false where id in (new.requester_id, new.recipient_id);
  end if;
  return new;
end;
$$;

create trigger matches_sync_is_matched
  after insert or update of status on matches
  for each row execute function sync_profiles_is_matched();

-- is_matched rejoint la liste des colonnes qu'un membre ne peut jamais
-- modifier lui-même sur sa propre ligne (même garde-fou que
-- is_staff/is_premium/is_test_account).
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
    or new.photo_verification_status is distinct from old.photo_verification_status
    or new.is_staff is distinct from old.is_staff
    or new.is_premium is distinct from old.is_premium
    or new.is_test_account is distinct from old.is_test_account
    or new.is_matched is distinct from old.is_matched then
    raise exception 'Modification des statuts de vérification/badges non autorisée';
  end if;

  return new;
end;
$$;
