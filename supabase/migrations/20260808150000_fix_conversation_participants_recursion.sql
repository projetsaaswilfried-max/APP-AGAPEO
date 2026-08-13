-- ============================================================================
-- Correctif critique : les policies `conversation_participants_select` et
-- `conversation_participants_insert` interrogeaient `conversation_participants`
-- DEPUIS une policy DE `conversation_participants` (auto-jointure), ce qui
-- déclenche "infinite recursion detected in policy" (SQLSTATE 42P17) dès que
-- Postgres évalue RLS sur cette table.
--
-- Comme `message_attachments_write`/`message_attachments_read` (sur
-- storage.objects) interrogent aussi `conversation_participants`, et que
-- Postgres évalue TOUTES les policies INSERT d'une table (combinées en OR),
-- cette récursion cassait même les uploads vers le bucket `avatars` — sans
-- lien apparent avec la messagerie côté utilisateur.
--
-- Fix : passer par une fonction SECURITY DEFINER (même pattern que
-- is_admin_or_moderator / is_blocked), qui contourne la RLS lors de sa
-- propre lecture de la table et casse ainsi la boucle.
-- ============================================================================

create function is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = conv_id and cp.user_id = uid
  );
$$;

drop policy if exists conversation_participants_select on conversation_participants;
create policy conversation_participants_select on conversation_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_conversation_participant(conversation_id, auth.uid())
  );

drop policy if exists conversation_participants_insert on conversation_participants;
create policy conversation_participants_insert on conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (
      not is_blocked(auth.uid(), user_id)
      and is_conversation_participant(conversation_id, auth.uid())
    )
  );
