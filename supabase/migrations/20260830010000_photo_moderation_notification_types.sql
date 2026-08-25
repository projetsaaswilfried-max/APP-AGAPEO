-- Migration isolée : Postgres interdit d'utiliser une valeur d'enum tout
-- juste ajoutée dans la même transaction (cf. notifications de match/invitation).
alter type notification_type add value 'PHOTO_APPROVED';
alter type notification_type add value 'PHOTO_REJECTED';
