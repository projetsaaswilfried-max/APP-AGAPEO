-- ============================================================================
-- Cause racine trouvee en reparant 137 vrais profils bloques a la soumission
-- ("il te manque une photo" malgre de vraies photos existantes, parfois une
-- seule, jamais supprimee) : `is_primary` vaut `false` par defaut, et rien
-- ne garantissait qu'une photo devienne automatiquement principale a
-- l'ajout -- le calcul cote web avait un bug (corrige separement, cf.
-- photo-manager.tsx) sur le cas "photo principale supprimee puis une
-- nouvelle ajoutee", mais l'app MOBILE ecrit directement dans
-- profile_photos sans jamais passer par ce code, et rien ne l'obligeait a
-- fixer is_primary=true pour la toute premiere photo d'un profil.
--
-- Corrige au niveau base (donc valable pour TOUS les clients, presents et
-- futurs) : si une photo est inseree alors qu'aucune autre photo n'est deja
-- principale pour ce profil, elle le devient automatiquement, et
-- profiles.avatar_url est mis a jour en consequence.
--
-- protect_avatar_url_integrity() doit reconnaitre le meme GUC de
-- contournement que protect_privileged_profile_columns() : ce trigger met a
-- jour avatar_url DEPUIS un trigger BEFORE INSERT sur profile_photos, donc
-- AVANT que la ligne elle-meme n'existe reellement dans la table -- la
-- verification habituelle ("cette URL correspond bien a une de tes photos")
-- ne trouverait jamais la ligne en cours d'insertion et rejetterait a tort
-- la mise a jour.
-- ============================================================================

create or replace function protect_avatar_url_integrity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null
    or is_admin_or_moderator(auth.uid())
    or current_setting('agapeo.bypass_privileged_columns_guard', true) = 'on' then
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

create or replace function ensure_primary_photo_on_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not new.is_primary then
    if not exists (
      select 1 from profile_photos
      where profile_id = new.profile_id and is_primary = true
    ) then
      new.is_primary := true;
    end if;
  end if;

  if new.is_primary then
    perform set_config('agapeo.bypass_privileged_columns_guard', 'on', true);
    update profiles set avatar_url = new.url where id = new.profile_id and avatar_url is distinct from new.url;
  end if;

  return new;
end;
$$;

drop trigger if exists profile_photos_ensure_primary on profile_photos;
create trigger profile_photos_ensure_primary
  before insert on profile_photos
  for each row execute function ensure_primary_photo_on_insert();
