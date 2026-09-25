-- ============================================================================
-- Bug reel trouve en observant un vrai membre bloque a la soumission
-- ("il te manque une photo" alors que des photos existaient bien) :
-- supprimer sa photo principale tout en gardant d'autres photos ne
-- desingait plus JAMAIS aucune photo comme principale ensuite -- ni la
-- suppression elle-meme (ce trigger ne faisait que reinitialiser
-- avatar_url/photo_verification_status, jamais promouvoir une photo
-- restante), ni un nouvel ajout (correctif cote app : le calcul se basait
-- sur le nombre total de photos, jamais reinitialise a 0 une fois qu'on a
-- eu au moins une photo). Resultat : avatar_url restait null pour
-- toujours, malgre de vraies photos existantes, et isProfileComplete()
-- refusait indefiniment la soumission pour "photo manquante".
--
-- Corrige ici cote base (donc valable pour le web ET l'app mobile, qui
-- supprime directement via Supabase sans passer par la Server Action) :
-- si une photo restante existe apres la suppression, elle est promue
-- principale et avatar_url mis a jour en consequence. Ne compromet pas la
-- verification anti-usurpation : photo_verification_status repasse quand
-- meme a UNVERIFIED (reste invisible dans Decouvrir, exige toujours un
-- nouveau selfie complet pour redevenir verifie) -- seule la DESIGNATION
-- d'une photo comme "principale" change, pas le statut de verification.
-- ============================================================================

create or replace function reset_verification_on_primary_photo_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  replacement record;
begin
  if old.is_primary then
    perform set_config('agapeo.bypass_privileged_columns_guard', 'on', true);

    select id, url into replacement
    from profile_photos
    where profile_id = old.profile_id
    order by created_at asc
    limit 1;

    if replacement.id is not null then
      update profile_photos set is_primary = true where id = replacement.id;
      update profiles
      set avatar_url = replacement.url, photo_verification_status = 'UNVERIFIED'
      where id = old.profile_id;
    else
      update profiles
      set avatar_url = null, photo_verification_status = 'UNVERIFIED'
      where id = old.profile_id;
    end if;
  end if;

  return old;
end;
$$;
