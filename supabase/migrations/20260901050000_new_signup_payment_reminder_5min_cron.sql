-- ============================================================================
-- Cron de relance "paiement d'accès non effectué" pour les nouvelles
-- inscriptions (paywall pré-onboarding, cf. migration new_signup_payment_required)
-- — 6 paliers (10 minutes, J+1..J+5) : le palier à 10 minutes exige une
-- exécution toutes les 5 minutes, la fonction elle-même décide, compte par
-- compte, quel palier est réellement dû (cf. new-signup-payment-reminder/index.ts).
-- ============================================================================

select
  cron.schedule(
    'new-signup-payment-reminder-5min',
    '*/5 * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/new-signup-payment-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'new-signup-payment-reminder-5min');
