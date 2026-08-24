-- ============================================================================
-- Ajuste la situation matrimoniale : "célibataire" se scinde en "sans enfant"
-- / "avec enfant" (4 options au total). Aucune donnée réelle ne dépendait
-- encore de l'ancien type (fonctionnalité déployée il y a quelques minutes,
-- confirmé en base avant cette migration) — on recrée donc le type plutôt
-- que de migrer des valeurs.
-- ============================================================================

alter table profiles drop column marital_status;
alter table profiles drop column desired_marital_statuses;
drop type marital_status_type;

create type marital_status_type as enum ('SINGLE_NO_CHILDREN', 'SINGLE_WITH_CHILDREN', 'DIVORCED', 'WIDOWED');

alter table profiles add column marital_status marital_status_type;
alter table profiles add column desired_marital_statuses marital_status_type[] not null default '{}';
