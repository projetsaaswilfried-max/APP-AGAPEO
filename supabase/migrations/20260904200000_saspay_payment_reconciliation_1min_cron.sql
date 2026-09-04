-- ============================================================================
-- Filet de sécurité paiements SasPay — même principe que le cron équivalent
-- pour Chariow (20260902170000), mais la corrélation est ici directe : le
-- webhook SasPay ne porte aucune métadonnée permettant de retrouver le
-- membre, donc chaque transaction PENDING est comparée à sa session réelle.
-- ============================================================================

select
  cron.schedule(
    'saspay-payment-reconciliation-1min',
    '* * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/saspay-payment-reconciliation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'saspay-payment-reconciliation-1min');
