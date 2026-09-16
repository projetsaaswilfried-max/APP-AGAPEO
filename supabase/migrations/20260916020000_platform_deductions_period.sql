-- ============================================================================
-- Un prélèvement de plateforme de paiement porte sur une PÉRIODE de CA
-- encaissé (ex : "voici ce que Chariow a prélevé sur tout ce qui a été
-- encaissé entre le 1er et le 15 septembre"), jamais une date ponctuelle —
-- remplace `deduction_date` par un couple `period_start`/`period_end`.
-- Table encore vide en production (feature livrée le jour même), aucun
-- backfill nécessaire.
-- ============================================================================

alter table platform_deductions drop column deduction_date;
alter table platform_deductions add column period_start date not null;
alter table platform_deductions add column period_end date not null;
alter table platform_deductions add constraint platform_deductions_period_check check (period_end >= period_start);

drop index if exists platform_deductions_date_idx;
create index platform_deductions_period_idx on platform_deductions (period_end desc);
