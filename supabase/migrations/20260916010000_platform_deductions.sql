-- ============================================================================
-- Module Finances (/ayekoutche/finances, SUPER_ADMIN uniquement) : passe le
-- reporting en USD, et ajoute le "solde en CA" façon expert-comptable.
--
-- Chariow/SasPay prélèvent chacun un pourcentage au moment du retrait des
-- fonds — ce prélèvement n'est jamais communiqué par API (aucun webhook ni
-- endpoint ne l'expose), seulement constaté a posteriori sur le relevé de
-- retrait réel. `platform_deductions` est donc, comme `expenses`, alimentée
-- manuellement — jamais calculée automatiquement à partir de `transactions`.
-- Même principe que `transactions`/`expenses` : verrouillée par défaut,
-- aucune policy pour authenticated/anon, seul le client service_role y accède.
-- ============================================================================

create table platform_deductions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'USD',
  deduction_date date not null default current_date,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_deductions_date_idx on platform_deductions (deduction_date desc);

alter table platform_deductions enable row level security;

-- Le reporting Finances passe en USD (devise de référence pour le suivi
-- comptable interne, indépendante de la devise réellement facturée aux
-- membres) — les nouvelles dépenses sont désormais saisies directement en
-- USD plutôt qu'en FCFA.
alter table expenses alter column currency set default 'USD';
