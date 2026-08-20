-- ============================================================================
-- "Supprimer la discussion" côté membre : masque la conversation de SA
-- propre liste sans rien supprimer côté serveur ni chez l'autre participant.
-- Si l'un ou l'autre envoie un nouveau message ensuite, la conversation
-- redevient visible pour tous les participants (comportement standard des
-- apps de messagerie — on ne perd jamais définitivement l'accès).
-- ============================================================================

alter table conversation_participants add column hidden_at timestamptz;

create function unhide_conversation_on_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update conversation_participants
  set hidden_at = null
  where conversation_id = new.conversation_id and hidden_at is not null;
  return new;
end;
$$;

create trigger messages_unhide_conversation
  after insert on messages
  for each row execute function unhide_conversation_on_new_message();
