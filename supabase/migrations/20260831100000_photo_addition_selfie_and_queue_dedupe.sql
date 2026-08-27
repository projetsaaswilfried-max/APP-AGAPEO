-- ============================================================================
-- Demande du fondateur : quand un membre déjà VÉRIFIÉ ajoute une nouvelle
-- photo à sa galerie plus tard (dans "Mon Profil"), il doit désormais refaire
-- un selfie en direct pour cette soumission (même principe anti-usurpation
-- que la toute première vérification, qui elle ne couvrait jusqu'ici QUE le
-- lot initial de photos). `selfie_storage_path` stocke ce selfie, rattaché à
-- CETTE photo précise, pour que l'équipe compare dans "Photos" — exactement
-- comme `verification_requests.selfie_storage_path` pour le dossier initial.
-- NULL pour les photos du tout premier lot (déjà comparées via le dossier de
-- vérification) et pour tout ajout fait par un membre pas encore vérifié.
-- ============================================================================

alter table profile_photos add column selfie_storage_path text;

comment on column profile_photos.selfie_storage_path is
  'Selfie pris en direct au moment de CETTE soumission (ajout après une première vérification déjà validée) — comparé par l''équipe dans Admin > Photos. NULL pour le premier lot de photos (déjà comparé via le dossier de vérification) et pour tout ajout avant la première vérification.';

-- Même verrou que url/storage_path : une fois soumis, ce chemin ne doit plus
-- pouvoir être modifié par le propriétaire (c'est une preuve, pas un champ éditable).
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

  if new.selfie_storage_path is distinct from old.selfie_storage_path then
    raise exception 'Le selfie associé à une photo ne peut pas être modifié après coup.';
  end if;

  return new;
end;
$$;
