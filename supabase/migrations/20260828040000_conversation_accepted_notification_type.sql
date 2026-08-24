-- Nouvelle valeur d'enum isolée (cf. règle Postgres : impossible d'utiliser
-- une valeur tout juste ajoutée dans la même transaction) — utilisée par le
-- trigger de 20260828050000 qui notifie l'initiateur d'une invitation
-- lorsqu'elle est acceptée.
alter type notification_type add value 'CONVERSATION_ACCEPTED';
