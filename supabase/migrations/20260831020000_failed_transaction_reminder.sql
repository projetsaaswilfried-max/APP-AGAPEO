-- ============================================================================
-- Relance automatique par email, 3 jours après une transaction Chariow
-- passée en FAILED (paiement échoué ou abandonné), pour inviter la personne
-- à réessayer — et si le problème persiste, à contacter support@agapeo.love.
-- Un seul envoi par transaction, suivi via failure_reminder_sent (même
-- principe que subscription_reminder_stage / onboarding_sequence_stage).
-- ============================================================================

alter table transactions add column failure_reminder_sent boolean not null default false;

comment on column transactions.failure_reminder_sent is
  'Vrai une fois la relance "réessaie ton paiement" envoyée pour cette transaction FAILED — jamais renvoyée deux fois.';
