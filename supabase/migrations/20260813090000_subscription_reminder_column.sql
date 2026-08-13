-- Empêche l'envoi répété de l'email de relance chaque jour pendant toute la
-- fenêtre des 3 jours avant expiration — un seul envoi par période, remis à
-- zéro à chaque renouvellement réussi (cf. route webhook Chariow).
alter table profile_restricted add column subscription_reminder_sent_at timestamptz;
