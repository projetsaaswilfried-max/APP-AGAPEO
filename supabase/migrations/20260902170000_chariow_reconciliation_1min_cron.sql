-- ============================================================================
-- Passe le filet de sécurité paiements Chariow de 10 minutes à 1 minute —
-- réduit le temps maximal pendant lequel un client payant peut rester
-- bloqué sans accès si son webhook n'est jamais livré.
-- ============================================================================

select cron.unschedule('chariow-payment-reconciliation-10min')
where exists (select 1 from cron.job where jobname = 'chariow-payment-reconciliation-10min');

select
  cron.schedule(
    'chariow-payment-reconciliation-1min',
    '* * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/chariow-payment-reconciliation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'chariow-payment-reconciliation-1min');
