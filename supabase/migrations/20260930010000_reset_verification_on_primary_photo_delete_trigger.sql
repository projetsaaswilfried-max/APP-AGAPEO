-- ============================================================================
-- Bug trouvé par le dev en testant depuis l'app : supprimer sa photo
-- principale ne repassait PAS le profil en UNVERIFIED côté mobile.
--
-- Cause : ce reset (avatar_url + photo_verification_status -> UNVERIFIED)
-- n'existait QUE dans le code de `removeProfilePhotoAction` (Server Action
-- Next.js, web uniquement), via un client service-role pour contourner le
-- trigger `protect_privileged_profile_columns`. L'app mobile parle
-- directement à Supabase (jamais aux Server Actions Next.js) : elle peut
-- bien supprimer la ligne `profile_photos` (RLS `profile_photos_delete_own`
-- l'autorise), mais rien ne déclenchait ensuite le reset du profil — le
-- statut restait VERIFIED avec un avatar_url pointant vers une photo qui
-- n'existe plus.
--
-- Correctif : déplacer ce reset dans un trigger AFTER DELETE sur
-- `profile_photos`, pour qu'il s'applique quel que soit l'appelant (web,
-- mobile, admin, seed de test...), au lieu d'un comportement dupliqué par
-- client. Comme ce trigger doit modifier une colonne protégée
-- (`photo_verification_status`) alors que `auth.uid()` reste celui du
-- membre (pas null, pas admin) tout au long de la même transaction, on lui
-- fait poser un GUC local ('agapeo.bypass_privileged_columns_guard') que
-- `protect_privileged_profile_columns` reconnaît explicitement — ce GUC
-- n'est réglable que depuis l'intérieur de ce trigger SECURITY DEFINER,
-- jamais exposé à un client.
-- ============================================================================

create or replace function protect_privileged_profile_columns()
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

create or replace function reset_verification_on_primary_photo_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.is_primary then
    perform set_config('agapeo.bypass_privileged_columns_guard', 'on', true);
    update profiles
    set avatar_url = null, photo_verification_status = 'UNVERIFIED'
    where id = old.profile_id;
  end if;

  return old;
end;
$$;

drop trigger if exists profile_photos_reset_verification_on_primary_delete on profile_photos;
create trigger profile_photos_reset_verification_on_primary_delete
  after delete on profile_photos
  for each row execute function reset_verification_on_primary_photo_delete();
