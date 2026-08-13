-- Notifie le membre quand le staff répond dans son dossier de support —
-- même mécanisme que notify_new_message() pour la messagerie normale.
create function notify_support_reply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ticket_owner_id uuid;
begin
  if not new.is_staff then
    return new;
  end if;

  select user_id into ticket_owner_id from support_tickets where id = new.ticket_id;

  insert into notifications (recipient_id, actor_id, type, title, body, target_url)
  values (
    ticket_owner_id,
    new.author_id,
    'SUPPORT_REPLY',
    'Le support a répondu à votre demande',
    left(new.content, 140),
    '/support?ticket=' || new.ticket_id
  );

  return new;
end;
$$;

create trigger support_messages_notify_reply
  after insert on support_messages
  for each row execute function notify_support_reply();
