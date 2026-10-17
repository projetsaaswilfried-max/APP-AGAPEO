-- ============================================================================
-- Marqueur dédié à la migration unique annonçant l'essai Premium gratuit de
-- 24h aux comptes déjà existants avant le lancement de cette fonctionnalité
-- (cf. script scripts/announce-trial-to-existing-users.mjs, exécuté une seule
-- fois) — uniquement pour les membres FREE non vérifiés, qui reçoivent un
-- email d'annonce mais pas encore l'essai (il ne démarre qu'à la validation).
-- Les membres FREE déjà vérifiés n'ont pas besoin de ce marqueur : leur
-- essai démarre immédiatement et trial_granted_at suffit à rendre ce cas
-- idempotent.
-- ============================================================================

alter table profile_restricted add column legacy_trial_announcement_sent boolean not null default false;
