-- ============================================================================
-- Retire la grâce de 3 invitations gratuites/mois pour les comptes FREE :
-- envoyer une invitation (donc démarrer une conversation) exige désormais un
-- accès actif dans tous les cas, sans exception — même règle que pour un
-- compte EXPIRED (déjà sans grâce depuis conversations_insert_free_grace_excludes_expired.sql).
-- Un compte FREE peut toujours parcourir Découvrir et recevoir des messages
-- (rien ne change ici) ; c'est uniquement l'action d'initier lui-même un
-- contact qui devient payante, sans palier intermédiaire.
-- count_monthly_invitations() reste définie (plus référencée nulle part
-- ailleurs) au cas où cette grâce serait réintroduite plus tard.
-- ============================================================================

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (
      (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
      and (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
    )
  );
