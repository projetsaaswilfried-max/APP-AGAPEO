-- ============================================================================
-- Rafraîchit une fois par jour les taux de change utilisés pour la conversion
-- automatique FCFA -> devise locale des paiements Mobile Money (cf. fx_rates,
-- refresh-fx-rates, src/lib/fx-rates.ts). La source (open.er-api.com) ne se
-- met elle-même à jour qu'~1x/jour côté fournisseur — inutile d'appeler plus
-- souvent.
-- ============================================================================

select
  cron.schedule(
    'refresh-fx-rates-daily',
    '17 3 * * *',
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/refresh-fx-rates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'refresh-fx-rates-daily');
