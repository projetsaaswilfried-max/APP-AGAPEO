-- ============================================================================
-- Correction : la relance "paiement échoué" a 3 paliers (5 minutes, J+1,
-- J+3) — une exécution quotidienne ne peut pas déclencher le palier à 5
-- minutes. Remplace le cron quotidien par une exécution toutes les 5
-- minutes ; la fonction elle-même décide, transaction par transaction,
-- quel palier est réellement dû (cf. failed-transaction-reminder/index.ts).
-- ============================================================================

select cron.unschedule('daily-failed-transaction-reminder')
where exists (select 1 from cron.job where jobname = 'daily-failed-transaction-reminder');

select
  cron.schedule(
    'failed-transaction-reminder-5min',
    '*/5 * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/failed-transaction-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'failed-transaction-reminder-5min');
