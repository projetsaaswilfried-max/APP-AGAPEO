-- ============================================================================
-- Module Finances (/ayekoutche/finances, SUPER_ADMIN uniquement) : suivi
-- manuel des dépenses/charges de la plateforme, pour calculer un bénéfice net
-- (chiffre d'affaires réel des `transactions` SUCCEEDED, moins ces dépenses).
-- Même principe que `transactions` : verrouillée par défaut, aucune policy
-- pour authenticated/anon, seul le client service_role (admin.ts) y accède.
-- ============================================================================

create table expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'XOF',
  expense_date date not null default current_date,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_date_idx on expenses (expense_date desc);

alter table expenses enable row level security;
