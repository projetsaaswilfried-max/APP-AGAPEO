-- ============================================================================
-- Fermeture totale de l'essai Premium gratuit de 24h (décision produit
-- annulée). Tous les comptes concernés ont déjà été repassés en FREE
-- manuellement avant cette migration — ces colonnes ne servent plus à rien,
-- ni au code (déjà reverté), ni à aucune automatisation (cron déjà
-- désinscrit, cf. 20261018000000). Suppression demandée explicitement,
-- y compris la trace historique de qui avait reçu l'essai.
-- ============================================================================

alter table profile_restricted drop column if exists trial_granted_at;
alter table profile_restricted drop column if exists trial_reminder_stage;
alter table profile_restricted drop column if exists onboarding_in_app_nudge_stage;
alter table profile_restricted drop column if exists legacy_trial_announcement_sent;
