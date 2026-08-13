-- ============================================================================
-- Accusés de lecture datés, journal d'audit admin, campagnes email
-- programmées. Trois besoins indépendants regroupés dans une seule migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Accusé de lecture avec horodatage réel (affiché au survol de la coche)
-- ----------------------------------------------------------------------------
alter table messages add column read_at timestamptz;

-- ----------------------------------------------------------------------------
-- Journal d'audit des actions admin — traçabilité, pas de policy pour les
-- rôles authenticated/anon (accès uniquement via service_role, cf. admin.ts).
-- ----------------------------------------------------------------------------
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on admin_audit_log (created_at desc);
alter table admin_audit_log enable row level security;

-- ----------------------------------------------------------------------------
-- Campagnes email : programmation à une date future
-- ----------------------------------------------------------------------------
create type email_campaign_status as enum ('SCHEDULED', 'SENT', 'FAILED', 'CANCELED');

alter table email_campaigns add column status email_campaign_status not null default 'SENT';
alter table email_campaigns add column scheduled_for timestamptz;
alter table email_campaigns add column direct_recipient_id uuid references profiles (id) on delete set null;

create index email_campaigns_scheduled_idx on email_campaigns (scheduled_for) where status = 'SCHEDULED';
