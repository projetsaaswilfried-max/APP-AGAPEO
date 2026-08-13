-- ============================================================================
-- Remplace le simple booléen de relance par un "palier" (5, 3 ou 1 jour avant
-- échéance) — nécessaire pour envoyer 3 rappels distincts par cycle
-- d'abonnement au lieu d'un seul. NULL = aucun rappel envoyé sur ce cycle ;
-- remis à NULL par le webhook Chariow à chaque renouvellement réussi.
-- ============================================================================

alter table profile_restricted drop column subscription_reminder_sent_at;
alter table profile_restricted add column subscription_reminder_stage int;
