-- ============================================================================
-- Correction : la relance "paiement échoué" doit être une séquence à 3
-- paliers (5 minutes, J+1, J+3), pas un envoi unique à J+3. Remplace le
-- booléen par un entier de palier (même principe que onboarding_sequence_stage
-- / premium_sequence_stage) pour suivre lequel a déjà été envoyé.
-- ============================================================================

alter table transactions drop column failure_reminder_sent;
alter table transactions add column failure_reminder_stage integer;

comment on column transactions.failure_reminder_stage is
  'Dernier palier (0 = 5 min, 1 = J+1, 2 = J+3) déjà envoyé pour cette transaction FAILED — NULL = aucun envoi.';
