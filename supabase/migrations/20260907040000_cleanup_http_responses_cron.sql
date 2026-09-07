-- ============================================================================
-- net._http_response (journal des réponses HTTP de pg_net, ex: nos crons qui
-- appellent nos Edge Functions) n'est jamais purgé automatiquement — trouvé
-- en audit performance : plus de 10 800 lignes accumulées en seulement 6
-- heures le 2026-09-07 (dont l'écrasante majorité en échec suite à une
-- dégradation ponctuelle côté Supabase). Sans purge, cette table grossit
-- indéfiniment. Ces lignes ne servent qu'au débogage à très court terme —
-- 24h de rétention est largement suffisant.
-- ============================================================================
create function cleanup_old_http_responses()
returns void
language sql
security definer
set search_path = net, public
as $$
  delete from net._http_response where created < now() - interval '24 hours';
$$;

select
  cron.schedule(
    'cleanup-http-responses-daily',
    '30 3 * * *',
    $$select cleanup_old_http_responses();$$
  )
where not exists (select 1 from cron.job where jobname = 'cleanup-http-responses-daily');
