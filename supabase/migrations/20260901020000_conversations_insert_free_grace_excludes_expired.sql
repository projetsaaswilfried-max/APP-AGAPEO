-- ============================================================================
-- Nouveau modèle payant : un compte dont l'abonnement a EXPIRÉ ne doit plus
-- pouvoir envoyer d'invitation du tout (ni via la grâce gratuite), alors
-- qu'un compte qui a toujours été FREE (jamais payé, membres déjà présents
-- avant ce changement) garde exactement sa grâce de 3 invitations/mois
-- actuelle. L'ancienne policy accordait cette grâce à "tout ce qui n'est pas
-- ACTIVE", ce qui aurait aussi couvert EXPIRED par erreur - on la restreint
-- ici explicitement à FREE.
-- ============================================================================

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (
      (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
      and (
        (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
        or (
          (select subscription_status from profile_restricted where id = auth.uid()) = 'FREE'
          and count_monthly_invitations(auth.uid()) < 3
        )
      )
    )
  );
