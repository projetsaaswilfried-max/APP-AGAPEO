-- ============================================================================
-- Corrige un bug préexistant (indépendant du gating Premium, révélé en le
-- testant en réel) : `insert into conversations` suivi d'un `.select()`
-- (RETURNING) échoue TOUJOURS avec une violation RLS, pour n'importe quel
-- utilisateur — `conversations_select` exige qu'une ligne
-- `conversation_participants` existe déjà pour pouvoir "voir" la ligne tout
-- juste insérée, hors aucun participant n'existe encore à cet instant précis.
-- Postgres applique la policy SELECT à toute clause RETURNING, y compris
-- via .select() côté PostgREST — la création d'un nouveau fil de discussion
-- n'a donc jamais pu aboutir en conditions réelles.
--
-- Solution : générer l'id AVANT l'insertion (au lieu de le lire par
-- RETURNING) et insérer les deux participants dans la même transaction —
-- plus besoin de relire la ligne `conversations` pour connaître son id, et
-- la conversation n'existe jamais dans un état "orphelin" sans participants.
-- SECURITY INVOKER (pas DEFINER) : la RLS de `conversations_insert`
-- (dont le gating Premium) continue de s'appliquer normalement.
-- ============================================================================

create function create_conversation_with_participant(other_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  if other_user_id = auth.uid() then
    raise exception 'Impossible de démarrer une conversation avec soi-même';
  end if;
  if is_blocked(auth.uid(), other_user_id) then
    raise exception 'Cette personne ne peut pas être contactée actuellement';
  end if;

  insert into conversations (id) values (new_id);
  insert into conversation_participants (conversation_id, user_id) values (new_id, auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (new_id, other_user_id);

  return new_id;
end;
$$;
