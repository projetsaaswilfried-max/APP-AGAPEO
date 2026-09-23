-- ============================================================================
-- Exception ciblée dans protect_photo_moderation_status() : le propriétaire
-- d'une photo peut désormais la faire passer lui-même de DRAFT à PENDING (et
-- uniquement cette transition, sur sa propre photo — RLS `profile_photos_
-- update_own` garantit déjà que profile_id = auth.uid()). Objectif : l'app
-- mobile (client authentifié normal, sans clé service_role) peut faire cette
-- soumission sans passer par un point d'API serveur dédié.
--
-- Toute autre transition (DRAFT/PENDING -> APPROVED/REJECTED, ou modification
-- de reviewed_at/reviewed_by/rejection_reason) reste bloquée pour qui n'est
-- pas is_admin_or_moderator, exactement comme avant. Le remplacement du
-- fichier (url/storage_path) et du selfie associé restent également
-- inconditionnellement bloqués, y compris pendant cette transition autorisée.
-- ============================================================================

create or replace function protect_photo_moderation_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  -- DRAFT -> PENDING, sans aucun changement des colonnes de décision (déjà
  -- forcément NULL sur une photo jamais examinée) : la seule chose que ça
  -- fait, c'est mettre la photo dans la file d'attente de l'équipe — jamais
  -- l'approuver/refuser soi-même.
  is_owner_submitting_draft boolean :=
    old.moderation_status = 'DRAFT'
    and new.moderation_status = 'PENDING'
    and new.reviewed_at is not distinct from old.reviewed_at
    and new.reviewed_by is not distinct from old.reviewed_by
    and new.rejection_reason is not distinct from old.rejection_reason;
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if (new.moderation_status is distinct from old.moderation_status
      or new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.rejection_reason is distinct from old.rejection_reason)
     and not is_owner_submitting_draft then
    raise exception 'Modification du statut de modération non autorisée';
  end if;

  if new.url is distinct from old.url or new.storage_path is distinct from old.storage_path then
    raise exception 'Le fichier d''une photo ne peut pas être remplacé — supprime-la et ajoute-en une nouvelle.';
  end if;

  if new.selfie_storage_path is distinct from old.selfie_storage_path then
    raise exception 'Le selfie associé à une photo ne peut pas être modifié après coup.';
  end if;

  return new;
end;
$$;
