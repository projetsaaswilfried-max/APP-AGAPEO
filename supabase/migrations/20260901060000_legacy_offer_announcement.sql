-- ============================================================================
-- Annonce ponctuelle du nouveau modèle payant (accès unique 2 329 FCFA / 30
-- jours) aux membres déjà présents avant ce pivot (payment_required = false)
-- qui n'ont pas d'accès actif — séquence de 5 emails (1h, J+1, J+2, J+3, J+5)
-- ancrée sur legacy_offer_announced_at, backfillé une seule fois ci-dessous
-- au moment du déploiement (même horodatage pour toute la cohorte, puisque
-- l'évènement annoncé n'est pas propre à chaque membre comme created_at).
-- ============================================================================

alter table profile_restricted add column legacy_offer_announced_at timestamptz;
alter table profile_restricted add column legacy_offer_reminder_stage integer;

comment on column profile_restricted.legacy_offer_announced_at is
  'Horodatage de rollout du pivot paywall pour ce membre déjà présent (backfillé une seule fois, jamais par membre) - ancre la séquence legacy-offer-announcement. NULL pour tout compte payment_required = true (pas concerné, cf. new-signup-payment-reminder).';
comment on column profile_restricted.legacy_offer_reminder_stage is
  'Palier déjà envoyé de la séquence "nouvelle offre" pour les membres existants (0=1h, 1=J+1, 2=J+2, 3=J+3, 4=J+5) - null tant qu''aucune relance n''a encore été envoyée.';

update profile_restricted pr
set legacy_offer_announced_at = now()
from profiles p
where p.id = pr.id
  and p.payment_required = false
  and p.is_test_account = false
  and pr.subscription_status <> 'ACTIVE'
  and pr.role = 'USER';
