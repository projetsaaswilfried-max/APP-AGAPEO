-- ============================================================================
-- Bug révélé en le testant en réel : create_conversation_with_participant()
-- est (à raison) SECURITY INVOKER pour que le gating Premium de
-- `conversations_insert` continue de s'appliquer à la création de la
-- conversation elle-même — mais son `insert into notifications` s'exécutait
-- donc aussi en tant qu'utilisateur normal, qui n'a (volontairement) aucune
-- policy INSERT sur `notifications` (cf. notify_new_message(), déjà
-- SECURITY DEFINER pour cette même raison). Résultat : la RPC entière
-- échouait avec une violation RLS sur `notifications`, et aucune conversation
-- n'était jamais créée.
--
-- Solution : isoler l'insertion de la notification dans une fonction
-- SECURITY DEFINER dédiée (même pattern que notify_new_message), appelée
-- depuis la fonction SECURITY INVOKER — seule cette notification bénéficie
-- du bypass RLS, le gating Premium sur la création de conversation reste
-- intact.
-- ============================================================================

create function notify_conversation_invite(p_recipient_id uuid, p_actor_id uuid, p_conversation_id uuid, p_actor_name text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, type, title, body, target_url)
  values (
    p_recipient_id,
    p_actor_id,
    'CONVERSATION_INVITE',
    coalesce(p_actor_name, 'Un membre') || ' souhaite discuter avec toi',
    'Accepte l''invitation pour commencer à échanger.',
    '/messages?conversation=' || p_conversation_id
  );
end;
$$;

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
  perform notify_conversation_invite(other_user_id, auth.uid(), new_id, requester_name);

  return new_id;
end;
$$;
