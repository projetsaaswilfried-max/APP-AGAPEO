-- ============================================================================
-- Blocage réel des fonctionnalités Premium (Chariow branché et testé) :
-- 1) Initier une NOUVELLE conversation nécessite un abonnement actif — un
--    membre gratuit peut toujours RÉPONDRE à un fil déjà existant (créé par
--    l'autre partie), seule la création d'un nouveau fil est gatée : c'est
--    l'insertion dans `conversations` qui est le bon point d'accroche, une
--    réponse n'insère qu'un message dans un fil déjà existant.
-- 2) "Qui m'a mis en favori" nécessite de pouvoir lire les lignes où JE suis
--    la personne favorisée (jusqu'ici seule sa propre liste de favoris émis
--    était lisible) — le filtrage Premium reste côté application (comme les
--    filtres avancés de Découvrir), cette policy ne fait qu'autoriser la
--    lecture nécessaire pour construire cette liste.
-- ============================================================================

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
  );

create policy favorites_select_as_favorited on favorites
  for select to authenticated
  using (favorite_profile_id = auth.uid());
