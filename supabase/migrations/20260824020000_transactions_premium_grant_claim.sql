-- Empêche un double-crédit de Premium si Chariow livre deux fois le même
-- évènement "successful.sale" en concurrence (jusqu'à 5 retries si notre
-- 200 n'arrive pas assez vite). L'ancienne logique lisait le statut de la
-- transaction AVANT l'upsert puis décidait d'étendre l'abonnement : deux
-- requêtes concurrentes pouvaient toutes les deux lire "pas encore
-- SUCCEEDED" et toutes les deux étendre la période. premium_granted_at sert
-- de verrou atomique : seule la requête qui réussit à le faire passer de
-- NULL à now() (via `update ... where premium_granted_at is null`) a le
-- droit d'étendre l'abonnement.
alter table transactions add column premium_granted_at timestamptz;
