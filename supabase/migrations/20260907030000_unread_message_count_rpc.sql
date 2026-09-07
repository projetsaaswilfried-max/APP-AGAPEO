-- ============================================================================
-- Trouvé en audit performance : useUnreadCounts() téléchargeait TOUS les
-- messages non envoyés par le membre dans TOUTES ses conversations
-- (jusqu'à 177 messages pour une seule conversation en réel) pour n'en
-- compter que les non-lus EN JAVASCRIPT, à chaque sondage (30s) et à chaque
-- évènement temps réel — sur chaque page du site. Ce calcul (JOIN +
-- comparaison de date) est natif à Postgres et peut se faire en une seule
-- requête indexée (messages_conversation_idx, conversation_participants_user_idx),
-- sans jamais rapatrier le contenu des messages.
-- ============================================================================
create function get_unread_message_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from messages m
  join conversation_participants cp
    on cp.conversation_id = m.conversation_id
   and cp.user_id = auth.uid()
  where m.sender_id <> auth.uid()
    and m.created_at > cp.last_read_at;
$$;
