-- Nouvelle valeur d'enum seule dans sa propre migration : Postgres interdit
-- d'utiliser une valeur ajoutée à un enum dans la même transaction que celle
-- qui l'ajoute. Positionnée juste avant 'ADVICE' (Conseil), comme demandé.
alter type post_category add value 'WORKSHOP' before 'ADVICE';
