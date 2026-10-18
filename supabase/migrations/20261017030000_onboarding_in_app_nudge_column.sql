-- ============================================================================
-- La séquence "Soumets ton profil" (J1/J3/J5/J7, UNVERIFIED) n'envoyait
-- jusqu'ici qu'un email — ajout d'un message Agapeo dans la messagerie, en
-- plus, pour mentionner l'essai Premium gratuit de 24h désormais offert à la
-- validation. Suivi indépendamment de l'email (même principe que
-- in_app_premium_nudge_stage / premium_sequence_stage), au cas où l'un des
-- deux canaux échouerait sans bloquer l'autre.
-- ============================================================================

alter table profile_restricted add column onboarding_in_app_nudge_stage int;

comment on column profile_restricted.onboarding_in_app_nudge_stage is
  'Palier déjà envoyé (1/3/5/7) côté messagerie (message Agapeo) de la séquence "soumets ton profil" — indépendant de onboarding_sequence_stage qui suit le même palier côté email.';
