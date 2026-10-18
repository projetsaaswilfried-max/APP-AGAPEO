-- ============================================================================
-- Planifie l'appel de l'Edge Function trial-access-reminders toutes les 15
-- minutes : fin de l'essai Premium gratuit de 24h (repasse en FREE) + les
-- deux relances à 10h/22h écoulées. 15 minutes suffit largement à la
-- précision requise par des paliers en heures (contrairement aux cron à 5
-- minutes existants, dont le palier le plus proche se compte en dizaines de
-- minutes).
-- ============================================================================

select
  cron.schedule(
    'trial-access-reminders-15min',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/trial-access-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'trial-access-reminders-15min');
