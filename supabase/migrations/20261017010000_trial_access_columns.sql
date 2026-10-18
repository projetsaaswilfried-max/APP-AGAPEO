-- ============================================================================
-- Essai Premium gratuit de 24h, accordé une seule fois par personne, à vie,
-- dès la toute première validation du profil (approveVerificationRequestAction).
--
-- `trial_granted_at` sert un double rôle, volontairement : marqueur permanent
-- "a déjà consommé son essai" (jamais remis à null, même quand l'essai se
-- termine ou que le profil perd puis retrouve sa vérification) ET horodatage
-- de départ pour calculer les paliers de relance (10h/22h) pendant que
-- l'essai est en cours. `subscription_plan = 'FREE_TRIAL'` distingue cet
-- octroi gratuit d'un vrai abonnement payant partout où subscription_status
-- vaut déjà 'ACTIVE' (le cron d'expiration ci-après ne doit jamais toucher un
-- abonnement réellement payé).
-- ============================================================================

alter table profile_restricted add column trial_granted_at timestamptz;
alter table profile_restricted add column trial_reminder_stage int;

comment on column profile_restricted.trial_granted_at is
  'Horodatage de l''unique essai Premium gratuit de 24h accordé à la première validation de profil — jamais remis à null, sert aussi de marqueur permanent "essai déjà consommé".';
comment on column profile_restricted.trial_reminder_stage is
  'Palier déjà envoyé de la relance d''expiration de l''essai gratuit : 0 = relance à 10h (reste 14h), 1 = relance à 22h (reste 2h, avec les offres). Null tant qu''aucune relance n''a été envoyée sur cet essai.';
