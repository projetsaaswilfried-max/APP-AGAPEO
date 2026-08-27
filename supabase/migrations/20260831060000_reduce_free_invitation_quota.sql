-- ============================================================================
-- Demande du fondateur : le quota d'invitations gratuites passe de 10 à 3
-- par mois civil. La messagerie elle-même reste inchangée — elle est déjà
-- verrouillée Premium pour tout le monde (initiateur ou destinataire) via
-- `messages_insert` (20260828010000_conversation_invitations.sql), qui exige
-- `subscription_status = 'ACTIVE'` sans exception liée à qui a lancé la
-- conversation. Seul le nombre d'invitations gratuites change ici.
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
        or count_monthly_invitations(auth.uid()) < 3
      )
    )
  );
