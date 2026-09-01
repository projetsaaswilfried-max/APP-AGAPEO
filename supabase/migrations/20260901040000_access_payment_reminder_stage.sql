-- ============================================================================
-- Suit la progression de la relance envoyée à une nouvelle inscription qui
-- n'a pas encore payé les 1999 FCFA d'accès (10 min, J+1, J+2, J+3, J+4,
-- J+5 après profiles.created_at - indices 0 à 5 dans cet ordre).
-- ============================================================================

alter table profile_restricted add column access_payment_reminder_stage integer;

comment on column profile_restricted.access_payment_reminder_stage is
  'Palier déjà envoyé de la relance "paiement d''accès non effectué" (0=10min, 1=J+1, 2=J+2, 3=J+3, 4=J+4, 5=J+5) - null tant qu''aucune relance n''a encore été envoyée. Cf. supabase/functions/new-signup-payment-reminder.';
