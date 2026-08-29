-- ============================================================================
-- Complète le statut DRAFT (migration précédente) :
--
-- 1. `profile_photos_insert_own` ne contraignait que le quota, jamais la
--    valeur initiale de `moderation_status` — un appel direct à l'API (hors
--    interface) aurait pu insérer une photo déjà APPROVED, s'auto-validant
--    sans jamais passer par l'équipe. Restreint désormais l'insertion à
--    DRAFT (onboarding, avant soumission) ou PENDING (ajout après
--    vérification, ou valeur par défaut) uniquement.
-- ============================================================================

drop policy if exists profile_photos_insert_own on profile_photos;

create policy profile_photos_insert_own on profile_photos
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and (
      is_admin_or_moderator(auth.uid())
      or (
        moderation_status in ('PENDING', 'DRAFT')
        and count_profile_photos(auth.uid()) < (
          case when (select is_premium from profiles where id = auth.uid()) then 10 else 2 end
        )
      )
    )
  );
