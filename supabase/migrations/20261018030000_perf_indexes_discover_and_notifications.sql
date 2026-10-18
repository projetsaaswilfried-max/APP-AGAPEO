-- ============================================================================
-- Correctifs de performance (audit 2026-10-18, pg_stat_statements) :
--
-- 1) La requête Découvrir (profiles filtrés par genre/vérification/âge/etc.,
--    triée par last_active_at) représentait à elle seule 51,5% de tout le
--    temps de calcul de la base (677ms de moyenne x 282 280 appels) malgré
--    une table de seulement 17 700 lignes / 21 Mo -- signe clair d'un index
--    manquant, pas d'un manque de puissance serveur. Index partiel (seuls
--    les profils réellement éligibles au Découvrir y entrent) sur les
--    colonnes filtrées en égalité + last_active_at desc en dernière colonne
--    pour satisfaire le ORDER BY sans tri séparé.
--
-- 2) upsert_aggregated_notification() (appelée à chaque message, like,
--    favori) cherche la notification non lue existante du même type/lien
--    pour ce destinataire -- sans index adapté, chaque envoi de message /
--    like / favori devait scanner une grande partie des notifications non
--    lues du destinataire. Mesuré : 1 à 2,8 secondes de moyenne sur ces
--    trois opérations.
--
-- CONCURRENTLY : tables en production sous trafic réel, on évite de
-- verrouiller les écritures pendant la construction des index.
-- ============================================================================

create index concurrently if not exists profiles_discover_candidates_idx
on profiles (gender, is_staff, photo_verification_status, is_matched, last_active_at desc)
where avatar_url is not null and church_denomination is not null and why_marriage is not null;

create index concurrently if not exists notifications_aggregate_lookup_idx
on notifications (recipient_id, type, target_url, created_at desc)
where not is_read;
