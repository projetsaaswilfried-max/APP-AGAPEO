-- Planifie l'appel hebdomadaire de l'Edge Function weekly-digest (recommandations
-- fortes par email). La clé service_role utilisée pour authentifier l'appel est
-- stockée dans Supabase Vault (secret nommé 'service_role_key', créé hors
-- migration pour ne jamais committer sa valeur en clair dans le repo) — cette
-- migration ne fait que la référencer par son nom.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'weekly-digest-recommendations',
    '0 9 * * 1', -- tous les lundis à 9h00 UTC
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/weekly-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'weekly-digest-recommendations');
