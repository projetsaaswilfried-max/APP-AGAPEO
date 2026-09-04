-- ============================================================================
-- Agrégateur de paiement actif (Chariow ou SasPay) — ligne unique, modifiable
-- depuis l'espace admin (SUPER_ADMIN uniquement). Lue par startPremiumCheckoutAction
-- pour savoir vers quel processeur rediriger un nouvel achat ; n'affecte
-- jamais les abonnements déjà actifs, quel que soit le processeur d'origine.
-- ============================================================================

create or replace function is_super_admin(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select role = 'SUPER_ADMIN' from profile_restricted where id = uid), false);
$$;

create table payment_settings (
  -- Verrou de singleton : une seule ligne peut jamais exister (id toujours `true`).
  id boolean primary key default true check (id),
  active_provider text not null default 'chariow' check (active_provider in ('chariow', 'saspay')),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

insert into payment_settings (id, active_provider) values (true, 'chariow');

alter table payment_settings enable row level security;

-- Lecture ouverte à tout membre connecté : savoir quel agrégateur est actif
-- n'expose aucune donnée sensible, et startPremiumCheckoutAction (exécuté
-- pour le compte du membre) en a besoin.
create policy payment_settings_select_authenticated on payment_settings
  for select to authenticated
  using (true);

create policy payment_settings_update_super_admin on payment_settings
  for update to authenticated
  using (is_super_admin(auth.uid()))
  with check (is_super_admin(auth.uid()));
