-- ============================================================================
-- Retour au format de base : trop de nouvelles inscriptions ne franchissaient
-- jamais le paywall pré-onboarding (231 comptes réels bloqués FREE + jamais
-- onboardés au moment de cette migration) — le fondateur revient sur le
-- paiement obligatoire avant l'onboarding. Onboarding redevient gratuit et
-- obligatoire pour tous ; le modèle payant redevient un upsell optionnel une
-- fois sur la plateforme (Découvrir en aperçu flouté tant que non VERIFIED,
-- 3 invitations gratuites/mois, messagerie réservée ACTIVE — déjà en place,
-- jamais modifié par le chantier payment_required, donc rien à recoder ici).
--
-- Tout repose sur payment_required : le redéfinir à false par défaut et
-- vider les lignes déjà à true suffit à désactiver tout le reste de la
-- logique existante (redirections vers /payment-required, carte restreinte
-- sur "Mon Plan") sans toucher à ce code, qui reste dormant mais réutilisable
-- si le fondateur veut retenter l'expérience plus tard.
-- ============================================================================

alter table profiles alter column payment_required set default false;

update profiles set payment_required = false where payment_required = true;

-- Coupe les deux séquences email attachées au paywall obligatoire, devenues
-- sans objet (plus personne ne sera bloqué en attente de paiement) — cf.
-- new-signup-payment-reminder/index.ts et legacy-offer-announcement/index.ts,
-- laissés en place (dormants) plutôt que supprimés.
select cron.unschedule('new-signup-payment-reminder-5min')
where exists (select 1 from cron.job where jobname = 'new-signup-payment-reminder-5min');

select cron.unschedule('legacy-offer-announcement-5min')
where exists (select 1 from cron.job where jobname = 'legacy-offer-announcement-5min');
