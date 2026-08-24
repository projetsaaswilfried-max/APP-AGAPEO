-- ============================================================================
-- Découvrir devient consultable (aperçu flouté) par les membres non vérifiés,
-- pour ne plus les bloquer avant même qu'ils aient une raison de finaliser
-- leur vérification (cf. discover.service.ts qui ne bloque plus getProfiles()).
-- En contrepartie, les interactions réelles (contacter, mettre en favori)
-- restent réservées aux profils vérifiés — appliqué ici en RLS (pas
-- seulement masqué dans l'UI) pour qu'un appel direct au service ne
-- contourne pas la restriction, même chose que le gating Premium existant.
-- ============================================================================

drop policy if exists messages_insert on messages;

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
    and (is_admin_or_moderator(auth.uid()) or (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED')
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
    and not exists (
      select 1 from conversation_participants other
      where other.conversation_id = messages.conversation_id
        and other.user_id <> auth.uid()
        and is_blocked(auth.uid(), other.user_id)
    )
  );

drop policy if exists favorites_insert_own on favorites;

create policy favorites_insert_own on favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_blocked(auth.uid(), favorite_profile_id)
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
    and (is_admin_or_moderator(auth.uid()) or (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED')
  );

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (
      (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
      and (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
    )
  );
