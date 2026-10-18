-- ============================================================================
-- Anomalie trouvée lors d'un audit (2026-10-18) : un compte réel avait
-- subscription_status = 'ACTIVE' avec subscription_plan ET
-- subscription_current_period_end tous les deux null — un accès Premium
-- gratuit et permanent, invisible pour le cron quotidien d'expiration
-- (son filtre `period_end < now()` ne matche jamais une valeur null).
-- Historique : aucune transaction, dernier log admin daté du 23/09 (avant
-- tout le code actuel), origine exacte non identifiable — probablement une
-- modification manuelle directe en base, antérieure aux garde-fous actuels.
-- Tous les chemins de code actuels (webhooks Chariow/SasPay/Stripe,
-- toggleUserPremiumAction) fixent toujours plan + period_end ensemble avec
-- ACTIVE ; cette anomalie ne peut donc plus se reproduire via l'app. On
-- ajoute une contrainte pour l'interdire aussi au niveau base, y compris
-- contre une future modification manuelle.
-- ============================================================================

update profile_restricted
set subscription_status = 'FREE'
where subscription_status = 'ACTIVE'
  and (subscription_plan is null or subscription_current_period_end is null);

alter table profile_restricted add constraint active_requires_plan_and_period_end
  check (subscription_status <> 'ACTIVE' or (subscription_plan is not null and subscription_current_period_end is not null));
