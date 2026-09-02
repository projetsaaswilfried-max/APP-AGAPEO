-- ============================================================================
-- Filet de sécurité contre les paiements Chariow reçus mais jamais activés
-- (webhook non livré, incident ponctuel côté Chariow...) — compare toutes les
-- ventes "completed" de l'API Chariow aux transactions déjà enregistrées et
-- régularise automatiquement tout écart trouvé (cf. chariow-payment-reconciliation).
-- Découvert le 2026-09-02 : plusieurs paiements réels (1 semaine, 4$) reçus
-- par Chariow sans jamais déclencher notre webhook.
-- ============================================================================

select
  cron.schedule(
    'chariow-payment-reconciliation-10min',
    '*/10 * * * *',
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
where not exists (select 1 from cron.job where jobname = 'chariow-payment-reconciliation-10min');
