-- Nouvelles valeurs de notification_type pour les invitations de discussion
-- et le système de matching (ci-après). Migration isolée : Postgres interdit
-- d'utiliser une valeur d'enum tout juste ajoutée dans la même transaction.
alter type notification_type add value 'CONVERSATION_INVITE';
alter type notification_type add value 'MATCH_REQUEST';
alter type notification_type add value 'MATCH_ACCEPTED';
