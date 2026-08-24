-- ============================================================================
-- Quand une invitation passe de PENDING à ACCEPTED, l'initiateur doit en
-- être notifié (demande explicite du fondateur). `acceptInvitation()` côté
-- service met à jour `conversations.status` avec le client authentifié
-- normal (RLS `conversations_respond_to_invite`) — un `insert into
-- notifications` direct depuis ce contexte échouerait (aucune policy INSERT
-- pour un utilisateur normal, volontairement — cf. notify_new_message()).
-- Un trigger SECURITY DEFINER sur la transition PENDING -> ACCEPTED évite de
-- toucher au chemin d'acceptation lui-même.
-- ============================================================================

create function notify_conversation_invite_accepted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  accepter_id uuid;
  accepter_name text;
begin
  if new.initiated_by is null then
    return new;
  end if;

  select cp.user_id into accepter_id
  from conversation_participants cp
  where cp.conversation_id = new.id and cp.user_id <> new.initiated_by
  limit 1;

  if accepter_id is null then
    return new;
  end if;

  select first_name into accepter_name from profiles where id = accepter_id;

  insert into notifications (recipient_id, actor_id, type, title, body, target_url)
  values (
    new.initiated_by,
    accepter_id,
    'CONVERSATION_ACCEPTED',
    coalesce(accepter_name, 'Un membre') || ' a accepté ton invitation',
    'Vous pouvez maintenant échanger librement.',
    '/messages?conversation=' || new.id
  );

  return new;
end;
$$;

create trigger conversations_notify_invite_accepted
  after update of status on conversations
  for each row
  when (new.status = 'ACCEPTED' and old.status = 'PENDING')
  execute function notify_conversation_invite_accepted();
