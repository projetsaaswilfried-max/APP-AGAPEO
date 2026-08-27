-- Planifie l'appel quotidien de l'Edge Function failed-transaction-reminder
-- (relance "réessaie ton paiement" 3 jours après une transaction FAILED).
-- Même mécanisme que daily-activation-email-sequences / daily-subscription-expiry —
-- la clé service_role est lue depuis Supabase Vault, jamais committée en clair.
select
  cron.schedule(
    'daily-failed-transaction-reminder',
    '0 9 * * *', -- tous les jours à 9h00 UTC
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
where not exists (select 1 from cron.job where jobname = 'daily-failed-transaction-reminder');
