-- ============================================================================
-- Le fil d'actualité rechargeait uniquement au montage de la page (aucune
-- mise à jour tant qu'on ne quittait/revenait pas dessus) — une nouvelle
-- publication de l'équipe n'apparaissait donc jamais toute seule chez
-- quelqu'un qui avait déjà le fil ouvert. `posts` doit être dans la
-- publication `supabase_realtime` pour que l'abonnement Realtime côté
-- client (subscribeToNewPosts) reçoive les INSERT. Bloc idempotent : ne
-- fait rien si déjà présent (ex. activé depuis le Dashboard).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table posts;
  end if;
end $$;
