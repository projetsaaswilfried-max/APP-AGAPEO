-- Nouvelle valeur de notification_type pour le bouton "liker un profil"
-- (distinct de NEW_FAVORITE/PROFILE_VISIT — cf. migration profile_likes qui
-- suit). Migration isolée : Postgres interdit d'utiliser une valeur d'enum
-- tout juste ajoutée dans la même transaction (même principe que
-- 20260828000000_invitation_match_notification_types.sql).
alter type notification_type add value 'PROFILE_LIKE';
