-- ============================================================================
-- Cron de la séquence "nouvelle offre" pour les membres déjà présents avant
-- le pivot paywall (payment_required = false, sans accès actif) — 5 paliers
-- (1h, J+1, J+2, J+3, J+5) : le palier à 1h exige une exécution toutes les 5
-- minutes, la fonction elle-même décide, compte par compte, quel palier est
-- réellement dû (cf. legacy-offer-announcement/index.ts).
-- ============================================================================

select
  cron.schedule(
    'legacy-offer-announcement-5min',
    '*/5 * * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/legacy-offer-announcement',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'legacy-offer-announcement-5min');
