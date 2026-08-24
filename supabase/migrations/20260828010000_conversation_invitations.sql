-- ============================================================================
-- Invitation avant messagerie : une nouvelle conversation démarre en attente
-- d'acceptation par le destinataire — aucun message ne peut être échangé
-- tant qu'elle n'est pas acceptée. Les conversations déjà actives (échange
-- déjà en cours) restent ACCEPTED via le défaut de colonne au moment de son
-- ajout, pour ne jamais verrouiller rétroactivement une discussion existante.
-- ============================================================================

create type conversation_status as enum ('PENDING', 'ACCEPTED', 'DECLINED');

alter table conversations add column status conversation_status not null default 'ACCEPTED';
alter table conversations add column initiated_by uuid references profiles (id) on delete set null;

-- Seules les conversations créées à partir de maintenant démarrent en
-- attente (le défaut de colonne ci-dessus a déjà classé les anciennes en
-- ACCEPTED avant ce changement).
alter table conversations alter column status set default 'PENDING';

-- Remplace create_conversation_with_participant : démarre désormais la
-- conversation en PENDING avec son initiateur tracé, et notifie le
-- destinataire de l'invitation reçue.
create or replace function create_conversation_with_participant(other_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  requester_name text;
begin
  if other_user_id = auth.uid() then
    raise exception 'Impossible de démarrer une conversation avec soi-même';
  end if;
  if is_blocked(auth.uid(), other_user_id) then
    raise exception 'Cette personne ne peut pas être contactée actuellement';
  end if;

  insert into conversations (id, status, initiated_by) values (new_id, 'PENDING', auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (new_id, auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (new_id, other_user_id);

  select first_name into requester_name from profiles where id = auth.uid();
  insert into notifications (recipient_id, actor_id, type, title, body, target_url)
  values (
    other_user_id,
    auth.uid(),
    'CONVERSATION_INVITE',
    coalesce(requester_name, 'Un membre') || ' souhaite discuter avec toi',
    'Accepte l''invitation pour commencer à échanger.',
    '/messages?conversation=' || new_id
  );

  return new_id;
end;
$$;

-- Un message ne peut être inséré que dans une conversation ACCEPTED, en plus
-- des conditions déjà en place (Premium, vérifié, participant, non bloqué).
drop policy if exists messages_insert on messages;

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
    and (is_admin_or_moderator(auth.uid()) or (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED')
    and exists (
      select 1 from conversations c where c.id = messages.conversation_id and c.status = 'ACCEPTED'
    )
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

-- Seul le DESTINATAIRE d'une invitation (jamais celui qui l'a envoyée) peut
-- la faire passer de PENDING à ACCEPTED ou DECLINED.
create policy conversations_respond_to_invite on conversations
  for update to authenticated
  using (
    status = 'PENDING'
    and initiated_by is distinct from auth.uid()
    and exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
  )
  with check (status in ('ACCEPTED', 'DECLINED'));
