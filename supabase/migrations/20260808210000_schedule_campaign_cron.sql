-- Planifie l'appel toutes les 5 minutes de l'Edge Function
-- send-scheduled-campaigns, qui envoie les campagnes email programmées dont
-- l'heure est arrivée. Réutilise le secret 'service_role_key' déjà stocké
-- dans Vault (cf. migration 20260808170000_weekly_digest_cron.sql).
select
  cron.schedule(
    'send-scheduled-email-campaigns',
    '*/5 * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/send-scheduled-campaigns',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'send-scheduled-email-campaigns');
