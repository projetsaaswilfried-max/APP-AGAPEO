-- ============================================================================
-- Test d'un nouveau modèle : les nouvelles inscriptions doivent payer 1999
-- FCFA (30 jours d'accès complet) avant d'atteindre l'onboarding. Les 800+
-- membres déjà inscrits ne doivent PAS être affectés (décision explicite du
-- fondateur) — cette colonne distingue durablement les deux cohortes.
--
-- Ordre important : `default false` d'abord (tous les comptes déjà existants
-- reçoivent `false` au moment de l'ajout de colonne), puis le `default` est
-- relevé à `true` immédiatement après — seules les lignes insérées à partir
-- de maintenant héritent de `true`. Aucun changement nécessaire dans
-- `handle_new_user()` : le défaut de colonne suffit.
-- ============================================================================

alter table profiles add column payment_required boolean not null default false;

alter table profiles alter column payment_required set default true;

comment on column profiles.payment_required is
  'Vrai pour tout compte créé après le lancement du paywall d''entrée (1999 FCFA / 30 jours) - ces comptes sont bloqués avant /onboarding tant qu''ils n''ont pas payé (cf. requireSession()/resolvePostAuthRedirect). Faux pour tous les comptes créés avant, qui gardent leur accès gratuit habituel.';
