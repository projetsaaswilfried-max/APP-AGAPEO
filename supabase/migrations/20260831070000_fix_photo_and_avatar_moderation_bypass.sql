-- ============================================================================
-- Audit sécurité (2e passage) : deux façons de contourner la modération des
-- photos qui avaient échappé au premier audit.
--
-- 1. `profile_photos_update_own` laisse le propriétaire modifier `url` /
--    `storage_path` d'une ligne déjà APPROVED — `protect_photo_moderation_status()`
--    ne protégeait que moderation_status/reviewed_at/reviewed_by/rejection_reason,
--    jamais le fichier réellement affiché. Aucun code applicatif ne modifie
--    ces deux colonnes via update() (remplacer une photo passe toujours par
--    delete + insert, qui repart bien en PENDING) — on peut donc bloquer ce
--    changement sans casser de parcours existant.
-- 2. `profiles.avatar_url` (colonne publique, hors RLS de profile_photos)
--    n'est protégée par aucun trigger : une requête directe (même JWT normal,
--    hors UI) peut la remplacer par n'importe quelle valeur, y compris une
--    photo jamais soumise à modération. L'invariant que l'app respecte déjà
--    elle-même côté code (addProfilePhotoAction / setPrimaryPhotoAction) est :
--    avatar_url ne doit correspondre qu'à une de ses propres photos APPROUVÉE,
--    sauf avant la toute première vérification (le profil n'est de toute
--    façon visible de personne d'autre à ce stade). On fait maintenant
--    respecter cet invariant au niveau base de données, pas seulement dans
--    le code applicatif qui peut être contourné par un appel direct à l'API.
-- ============================================================================

create or replace function protect_photo_moderation_status()
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

  if new.url is distinct from old.url or new.storage_path is distinct from old.storage_path then
    raise exception 'Le fichier d''une photo ne peut pas être remplacé — supprime-la et ajoute-en une nouvelle.';
  end if;

  return new;
end;
$$;

create function protect_avatar_url_integrity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null then
    if not exists (
      select 1 from profile_photos pp
      where pp.profile_id = auth.uid()
        and pp.url = new.avatar_url
        and (pp.moderation_status = 'APPROVED' or old.photo_verification_status <> 'VERIFIED')
    ) then
      raise exception 'avatar_url doit correspondre à une de tes photos déjà approuvées (ou à ton statut avant première vérification)';
    end if;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_avatar_url
  before update on profiles
  for each row execute function protect_avatar_url_integrity();
