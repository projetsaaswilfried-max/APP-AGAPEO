-- Planifie l'appel quotidien de l'Edge Function activation-email-sequences
-- (séquences "soumets ton profil" et "passe Premium", J1/J3/J5/J7). Même
-- mécanisme que daily-subscription-expiry : la clé service_role est lue
-- depuis Supabase Vault, jamais committée en clair.
select
  cron.schedule(
    'daily-activation-email-sequences',
    '0 8 * * *', -- tous les jours à 8h00 UTC — "le lendemain matin" de l'évènement déclencheur
    $$
    select net.http_post(
      url := 'https://cfmrykzqxcjhpktuxopu.supabase.co/functions/v1/activation-email-sequences',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (select 1 from cron.job where jobname = 'daily-activation-email-sequences');
