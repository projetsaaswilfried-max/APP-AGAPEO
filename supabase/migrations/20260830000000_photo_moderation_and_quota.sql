-- ============================================================================
-- Deux règles produit distinctes sur les photos de profil (hors avatar
-- posé pendant l'inscription initiale) :
--   1. Quota par palier : 2 photos pour un membre gratuit, 10 pour Premium
--      (équipe illimitée).
--   2. Modération : chaque photo ajoutée passe par une revue de l'équipe
--      avant d'être visible par quiconque d'autre que son propriétaire —
--      plateforme chrétienne, aucun contenu inapproprié ne doit apparaître
--      sans validation. `avatar_url` (colonne publique, lue partout sans
--      passer par la RLS de `profile_photos`) ne doit donc JAMAIS refléter
--      une photo non encore approuvée — c'est géré côté application
--      (addProfilePhotoAction / setPrimaryPhotoAction / approvePhotoAction),
--      pas ici.
--
-- Grandfathering : les photos déjà en base (avant cette migration) sont
-- marquées APPROVED par défaut — sans ça, tout l'historique de photos déjà
-- affichées sur la plateforme disparaîtrait d'un coup. Seules les photos
-- ajoutées à partir de maintenant démarrent PENDING (même technique que le
-- statut des conversations lors de l'ajout des invitations).
-- ============================================================================

create type photo_moderation_status as enum ('PENDING', 'APPROVED', 'REJECTED');

alter table profile_photos add column moderation_status photo_moderation_status not null default 'APPROVED';
alter table profile_photos add column reviewed_at timestamptz;
alter table profile_photos add column reviewed_by uuid references profiles (id) on delete set null;
alter table profile_photos add column rejection_reason text;

alter table profile_photos alter column moderation_status set default 'PENDING';

-- Un membre ne doit jamais pouvoir s'auto-approuver une photo en modifiant
-- directement les colonnes de modération de sa propre ligne — même
-- principe que protect_privileged_profile_columns() sur `profiles`.
create function protect_photo_moderation_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.moderation_status is distinct from old.moderation_status
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Modification du statut de modération non autorisée';
  end if;

  return new;
end;
$$;

create trigger profile_photos_protect_moderation
  before update on profile_photos
  for each row execute function protect_photo_moderation_status();

-- Une photo PENDING/REJECTED ne doit être visible que par son propriétaire.
drop policy if exists profile_photos_select on profile_photos;

create policy profile_photos_select on profile_photos
  for select to authenticated
  using (
    profile_id = auth.uid()
    or (
      moderation_status = 'APPROVED'
      and exists (
        select 1 from profiles p
        where p.id = profile_photos.profile_id
          and not p.is_invisible_profile and not is_blocked(auth.uid(), p.id)
      )
    )
  );

-- Comptage isolé en SECURITY DEFINER : un `select count(*) from
-- profile_photos` direct dans la policy INSERT ci-dessous ré-évaluerait sa
-- propre RLS et déclencherait une récursion infinie (42P17), déjà rencontrée
-- et corrigée pour `conversations_insert` — appliqué ici préventivement.
create function count_profile_photos(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select count(*)::integer from profile_photos where profile_id = p_user_id;
$$;

drop policy if exists profile_photos_write_own on profile_photos;

create policy profile_photos_insert_own on profile_photos
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (
      is_admin_or_moderator(auth.uid())
      or count_profile_photos(auth.uid()) < (
        case when (select is_premium from profiles where id = auth.uid()) then 10 else 2 end
      )
    )
  );

create policy profile_photos_update_own on profile_photos
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_photos_delete_own on profile_photos
  for delete to authenticated
  using (profile_id = auth.uid());
