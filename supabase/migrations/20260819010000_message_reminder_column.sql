-- Marque un message comme "déjà relancé par email" (fonctionnalité de
-- relance des messages non lus après 2h) — évite qu'un cron répété
-- renvoie le même rappel plusieurs fois pour le même message.
alter table messages add column reminder_email_sent_at timestamptz;
