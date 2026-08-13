-- ============================================================================
-- Préparation abonnement/paiement (config du fournisseur de paiement à venir
-- séparément) + campagnes email admin. Rien n'est simulé : les tables sont
-- réelles et vides tant qu'aucun paiement/campagne n'a eu lieu.
-- ============================================================================

create type subscription_status as enum ('FREE', 'ACTIVE', 'CANCELED', 'EXPIRED');
create type transaction_status as enum ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

alter table profiles add column subscription_status subscription_status not null default 'FREE';
alter table profiles add column subscription_plan text;
alter table profiles add column subscription_current_period_end timestamptz;

create index profiles_subscription_status_idx on profiles (subscription_status);

-- ----------------------------------------------------------------------------
-- TRANSACTIONS — alimentée plus tard par le webhook du fournisseur de paiement
-- ----------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  amount_cents int not null,
  currency text not null default 'XOF',
  status transaction_status not null default 'PENDING',
  plan text,
  provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

create index transactions_user_idx on transactions (user_id, created_at desc);
create index transactions_created_idx on transactions (created_at desc);

alter table transactions enable row level security;

-- Verrouillée par défaut : aucune policy pour les rôles authenticated/anon —
-- seul le client service_role (admin.ts, cf. admin/transactions/page.tsx) y
-- accède, exactement comme pour les autres lectures d'administration.

-- ----------------------------------------------------------------------------
-- EMAIL_CAMPAIGNS — historique des envois groupés depuis l'espace admin
-- ----------------------------------------------------------------------------
create table email_campaigns (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete set null,
  subject text not null,
  body_html text not null,
  audience text not null,
  recipients_count int not null default 0,
  failed_count int not null default 0,
  sent_at timestamptz not null default now()
);

create index email_campaigns_sent_idx on email_campaigns (sent_at desc);

alter table email_campaigns enable row level security;
-- Idem : verrouillée par défaut, accès uniquement via service_role.
