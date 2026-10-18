-- ============================================================================
-- Fermeture totale de l'essai Premium gratuit de 24h (décision produit
-- annulée, cf. revert sur approveVerificationRequestAction et suppression de
-- la fonction trial-access-reminders) : plus aucun essai en cours à éteindre
-- (tous les comptes concernés ont été repassés en FREE manuellement), ce cron
-- n'a donc plus rien à faire. On le désinscrit.
-- ============================================================================

select cron.unschedule('trial-access-reminders-15min')
where exists (select 1 from cron.job where jobname = 'trial-access-reminders-15min');
