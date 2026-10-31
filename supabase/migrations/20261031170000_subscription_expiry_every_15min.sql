-- L'expiration des abonnements ne tournait qu'une fois par jour (0 8 * * *).
-- Comme l'autorisation repose entièrement sur le drapeau
-- `profile_restricted.subscription_status` que ce cron abaisse, une période
-- payée se terminant juste après 08:00 UTC laissait l'accès Premium complet
-- ouvert pendant près de 24 heures sans paiement — sur un plan hebdomadaire
-- (le plus vendu aujourd'hui), c'est 14 % de l'abonnement offert, et l'email
-- de retrait comme le retour au gratuit arrivaient un jour en retard. Audit
-- du 2026-10-31 : 8 comptes dans ce cas à l'instant du constat.
--
-- Cette fonction est idempotente et bon marché à répétition : le downgrade ne
-- touche que les lignes qui franchissent l'échéance, les relances J-5/J-3/J-1
-- sont verrouillées par `subscription_reminder_stage` et la relance post-
-- retrait par `subscription_expiry_followup_sent` — un passage qui n'a rien à
-- faire sort sans aucune requête par membre. La passer au quart d'heure ramène
-- donc la fenêtre d'accès non payé de ~24 h à 15 min maximum, sans rien
-- changer à la sémantique des droits : toutes les couches (RLS mobile, session
-- web, miroir `profiles.is_premium`) continuent de lire le même drapeau et
-- restent donc cohérentes entre elles.
--
-- Effet de bord assumé sur les relances d'échéance : elles ne partent plus à
-- 08:00 UTC mais au franchissement réel du palier, c'est-à-dire à peu près à
-- l'heure de la journée où la personne a acheté — donc à une heure éveillée.
select cron.unschedule('daily-subscription-expiry')
where exists (select 1 from cron.job where jobname = 'daily-subscription-expiry');

select
  cron.schedule(
    'subscription-expiry-15min',
    '*/15 * * * *',
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
where not exists (select 1 from cron.job where jobname = 'subscription-expiry-15min');
