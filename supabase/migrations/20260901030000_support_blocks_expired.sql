-- ============================================================================
-- Nouveau modèle payant : un compte dont l'abonnement a EXPIRÉ ne doit plus
-- pouvoir contacter le support (ouvrir un dossier, ni répondre dans un
-- dossier déjà ouvert). Un compte FREE (jamais payé) garde l'accès complet
-- au support, exactement comme aujourd'hui - aucune condition n'existait
-- avant sur ces deux policies, on n'ajoute donc rien pour FREE, uniquement
-- une exclusion explicite d'EXPIRED. Le staff reste toujours exempté.
-- ============================================================================

drop policy if exists support_tickets_insert_own on support_tickets;

create policy support_tickets_insert_own on support_tickets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      is_admin_or_moderator(auth.uid())
      or (select subscription_status from profile_restricted where id = auth.uid()) <> 'EXPIRED'
    )
  );

drop policy if exists support_messages_insert on support_messages;

create policy support_messages_insert on support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id
        and t.status = 'OPEN'
        and t.user_id = support_messages.user_id
        and (
          (
            not support_messages.is_staff
            and t.user_id = auth.uid()
            and (select subscription_status from profile_restricted where id = auth.uid()) <> 'EXPIRED'
          )
          or (support_messages.is_staff and is_admin_or_moderator(auth.uid()))
        )
    )
  );
