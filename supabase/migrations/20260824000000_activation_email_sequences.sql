-- ============================================================================
-- Deux séquences d'emails automatiques sur 7 jours (J1/J3/J5/J7), suivies
-- individuellement pour ne jamais renvoyer deux fois le même palier :
--   1) "Soumets ton profil" — membres encore UNVERIFIED, à compter du
--      lendemain de leur inscription (profiles.created_at).
--   2) "Passe Premium" — membres VERIFIED mais pas encore Premium, à compter
--      du lendemain de leur validation (verification_requests.reviewed_at).
-- ============================================================================

alter table profile_restricted add column onboarding_sequence_stage integer;
alter table profile_restricted add column premium_sequence_stage integer;

comment on column profile_restricted.onboarding_sequence_stage is
  'Dernier palier (1/3/5/7) de la séquence "soumets ton profil" déjà envoyé — NULL = aucun envoi.';
comment on column profile_restricted.premium_sequence_stage is
  'Dernier palier (1/3/5/7) de la séquence "passe Premium" déjà envoyé — NULL = aucun envoi. Remis à NULL à chaque nouvelle validation de profil (approveVerificationRequestAction), pour repartir de zéro si le membre est revérifié après avoir perdu son statut.';
