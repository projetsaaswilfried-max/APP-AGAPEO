-- ============================================================================
-- Trouvé en audit : `profiles_select` autorisait n'importe quel membre
-- authentifié à lire la ligne `profiles` complète (avatar_url inclus) d'un
-- INCONNU non vérifié, tant qu'il n'était pas invisible/bloqué — aucune
-- exigence de statut VERIFIED. Or `addProfilePhotoAction` remplit désormais
-- `avatar_url` dès le tout premier upload, AVANT toute vérification (migration
-- du 2026-08-26, pour débloquer la première soumission) : le fichier de la
-- photo, stocké dans le bucket public `avatars`, devenait donc accessible via
-- une requête directe à l'API (bypass de l'UI, qui elle filtre déjà toujours
-- sur VERIFIED) pendant toute la fenêtre "en attente de vérification".
--
-- Corrigé en exigeant VERIFIED pour voir le profil d'un INCONNU, tout en
-- préservant deux cas légitimes : chacun voit toujours sa propre ligne, et
-- deux personnes qui partagent déjà une conversation (donc déjà validées et
-- mises en relation) continuent de se voir même si l'une perd son statut
-- vérifié entre-temps (photo supprimée) — sinon une conversation déjà en
-- cours se retrouverait cassée (nom/avatar de l'autre disparu).
-- ============================================================================

create function shares_conversation_with(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from conversation_participants cp1
    join conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
    where cp1.user_id = a and cp2.user_id = b
  );
$$;

drop policy if exists profiles_select on profiles;

create policy profiles_select on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or is_admin_or_moderator(auth.uid())
    or shares_conversation_with(auth.uid(), id)
    or (
      photo_verification_status = 'VERIFIED'
      and not is_invisible_profile
      and not is_blocked(auth.uid(), id)
    )
  );
