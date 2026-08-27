-- ============================================================================
-- Audit sécurité (2e passage) : `matches_insert` vérifiait que le DEMANDEUR
-- est bien participant de la conversation ACCEPTED citée, mais jamais que le
-- `recipient_id` fourni est réellement L'AUTRE participant de cette même
-- conversation. Le code applicatif (requestMatchAction) dérive toujours
-- correctement recipient_id depuis la conversation — mais un appel direct à
-- l'API avec un JWT normal pouvait proposer un match vers un `recipient_id`
-- arbitraire tant que la conversation citée était une conversation ACCEPTED
-- où l'auteur est participant. Combiné à l'index unique par paire de
-- `matches` actifs, ça permettait d'occuper la "place" de n'importe quelle
-- victime et de bloquer toute vraie demande de match pour cette paire tant
-- que la ligne forgée n'est pas annulée — un vecteur de nuisance/DoS, pas
-- d'élévation de droits (matches_update exige toujours recipient_id =
-- auth.uid() pour passer à ACCEPTED, donc aucune auto-acceptation possible).
-- ============================================================================

drop policy if exists matches_insert on matches;

create policy matches_insert on matches
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = matches.conversation_id and cp.user_id = auth.uid()
    )
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = matches.conversation_id and cp.user_id = matches.recipient_id
    )
    and exists (select 1 from conversations c where c.id = matches.conversation_id and c.status = 'ACCEPTED')
    and not exists (
      select 1 from profiles p where p.id in (matches.requester_id, matches.recipient_id) and p.is_matched
    )
  );
