-- Nouveau type de notification pour la relance "paiement échoué" (déjà
-- envoyée par email via l'Edge Function failed-transaction-reminder,
-- désormais aussi en notification in-app + push). Ajouté seul dans sa
-- propre migration : Postgres interdit d'utiliser une valeur d'enum dans la
-- même transaction que celle qui l'ajoute (même règle déjà appliquée pour
-- NEW_RESOURCE).
alter type notification_type add value 'PAYMENT_FAILED';
