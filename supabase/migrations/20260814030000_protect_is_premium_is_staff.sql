-- ============================================================================
-- Trouvé en audit de sécurité : `protect_privileged_profile_columns()` ne
-- gardait que email_verified/phone_verified/photo_verification_status.
-- `is_staff` et `is_premium` sont des colonnes PUBLIQUES sur `profiles`
-- (dérivées de `profile_restricted`, synchronisées par trigger) mais
-- `profiles_update_own` autorise la modification de N'IMPORTE QUELLE colonne
-- de sa propre ligne — sans ce garde-fou, un membre pouvait s'attribuer
-- `is_premium = true` (ou `is_staff = true`) directement via un appel
-- PostgREST, sans jamais passer par Chariow ni par profile_restricted.
--
-- Portée réelle du risque : is_premium/is_staff ne sont QUE des badges
-- publics et un critère de tri dans Découvrir — aucune policy RLS
-- (messages_insert, favorites_insert_own, conversations_insert,
-- record_profile_view) ne s'appuie dessus, elles vérifient toutes
-- `profile_restricted.subscription_status`/`role` directement, qui restent
-- verrouillés (aucune policy d'écriture pour authenticated). Un membre gratuit
-- ne pouvait donc pas débloquer de fonctionnalité réelle, seulement fausser
-- son classement de mise en avant dans Découvrir (et l'affichage du badge
-- "équipe") — corrigé ici par prudence et cohérence.
-- ============================================================================

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
    or new.is_premium is distinct from old.is_premium then
    raise exception 'Modification des statuts de vérification/badges non autorisée';
  end if;

  return new;
end;
$$;
