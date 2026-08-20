-- ============================================================================
-- `profiles_select` exclut un profil bloqué dans les deux sens (blocs
-- mutuels et symétriques) — un membre ne peut donc normalement plus du tout
-- lire le profil de quelqu'un qu'il a lui-même bloqué, ce qui l'empêche
-- d'afficher "Comptes bloqués" dans ses réglages pour les débloquer.
-- Fonction SECURITY DEFINER dédiée : ne renvoie QUE les profils que
-- l'appelant a lui-même bloqués (blocker_id = auth.uid()), avec le strict
-- minimum d'infos pour les afficher dans une liste.
-- ============================================================================

create function get_my_blocked_profiles()
returns table (id uuid, first_name text, avatar_url text)
language sql
stable
security definer set search_path = public
as $$
  select p.id, p.first_name, p.avatar_url
  from blocks b
  join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
