-- Nouvelle valeur d'enum seule dans sa propre migration : Postgres interdit
-- d'utiliser une valeur ajoutée à un enum dans la même transaction que celle
-- qui l'ajoute. Le trigger qui l'utilise vit dans la migration suivante.
alter type notification_type add value 'NEW_RESOURCE';
