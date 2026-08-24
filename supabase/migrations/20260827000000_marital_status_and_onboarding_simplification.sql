-- ============================================================================
-- Simplification de l'onboarding (3 étapes maximum) : ajoute la situation
-- matrimoniale (propre au membre + acceptée chez un partenaire), utilisée
-- comme critère de recherche à la place de plusieurs champs retirés de
-- l'inscription (qualités, passions, vision de famille, enfants/délais
-- souhaités, valeurs recherchées chez l'autre — ceux-ci restent modifiables
-- plus tard par le membre qui le souhaite, mais ne sont plus des critères de
-- recherche : aucun changement de schéma requis pour eux, déjà couverts par
-- ProfileEditableSchema).
--
-- Pas de "MARIÉ(E)" dans les valeurs possibles : la plateforme est réservée
-- aux célibataires en recherche sérieuse de mariage.
-- ============================================================================

create type marital_status_type as enum ('SINGLE', 'DIVORCED', 'WIDOWED');

alter table profiles add column marital_status marital_status_type;
alter table profiles add column desired_marital_statuses marital_status_type[] not null default '{}';
