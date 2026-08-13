-- Planifie l'appel quotidien de l'Edge Function subscription-expiry
-- (downgrade des abonnements expirés + relance email à 3 jours de
-- l'échéance). Même mécanisme que weekly-digest-recommendations : la clé
-- service_role est lue depuis Supabase Vault, jamais committée en clair.
select
  cron.schedule(
    'daily-subscription-expiry',
    '0 8 * * *', -- tous les jours à 8h00 UTC
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/subscription-expiry',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'daily-subscription-expiry');
