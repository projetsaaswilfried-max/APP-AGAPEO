-- Suivi de la relance à 24h après le retrait automatique de l'accès Premium
-- (non-paiement) — distinct des relances J-5/J-3/J-1 avant échéance :
-- subscription_expired_at marque le moment du passage à EXPIRED,
-- subscription_expiry_followup_sent évite un second envoi si le cron tourne
-- plusieurs fois avant/après la fenêtre des 24h.
alter table profile_restricted add column subscription_expired_at timestamptz;
alter table profile_restricted add column subscription_expiry_followup_sent boolean not null default false;
