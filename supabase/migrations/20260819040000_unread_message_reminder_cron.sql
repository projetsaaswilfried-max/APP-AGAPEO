-- Planifie l'appel toutes les 30 minutes de l'Edge Function
-- unread-message-reminder (relance par email des messages non lus depuis
-- plus de 2h). Même mécanisme que les autres crons : la clé service_role
-- est lue depuis Supabase Vault, jamais committée en clair. pg_cron et
-- pg_net sont déjà activés (20260808170000_weekly_digest_cron.sql).
select
  cron.schedule(
    'unread-message-reminder',
    '*/30 * * * *', -- toutes les 30 minutes
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/unread-message-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'unread-message-reminder');
