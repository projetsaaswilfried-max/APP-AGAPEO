-- ============================================================================
-- Audit sécurité (2e passage) : `push_subscriptions.endpoint` n'était validé
-- que sur son propriétaire (user_id = auth.uid()), jamais sur sa forme —
-- n'importe quelle URL pouvait y être stockée. `send-push-notification`
-- (service_role) appelle ensuite `webpush.sendNotification({ endpoint, ... })`
-- sur cette valeur sans re-vérification : un membre pouvait donc forcer le
-- serveur à faire une requête HTTP sortante vers une URL de son choix (SSRF
-- aveugle) simplement en s'abonnant lui-même avec un endpoint forgé, puis en
-- déclenchant n'importe quelle notification pour son propre compte.
-- Un vrai abonnement Web Push provient toujours d'un des quelques services
-- de push connus des navigateurs — on restreint donc `endpoint` à ces hôtes.
-- ============================================================================

alter table push_subscriptions add constraint push_subscriptions_endpoint_allowed_host check (
  endpoint like 'https://fcm.googleapis.com/%'
  or endpoint like 'https://updates.push.services.mozilla.com/%'
  or endpoint like 'https://web.push.apple.com/%'
);
