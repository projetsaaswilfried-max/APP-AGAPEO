-- ============================================================================
-- Vérification de profil : file d'attente explicite avec historique, au lieu
-- de piloter tout depuis `profiles.photo_verification_status` seul (qui ne
-- gardait aucune trace de "quand soumis", "pourquoi refusé", "avec quelle
-- priorité"). `profiles.photo_verification_status` reste la source de vérité
-- du badge public affiché partout (getProfileBadges) ; cette table est le
-- journal des demandes qui pilote ce badge.
-- ============================================================================

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  status verification_status not null default 'PENDING',
  -- Capturé à la soumission : un abonnement souscrit APRÈS coup ne doit pas
  -- rétroactivement changer la priorité déjà annoncée par email (48h/24h).
  is_priority boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint verification_requests_status_check check (status in ('PENDING', 'VERIFIED', 'REJECTED'))
);

create index verification_requests_queue_idx on verification_requests (is_priority desc, submitted_at asc) where status = 'PENDING';
create index verification_requests_user_idx on verification_requests (user_id, created_at desc);

-- Un seul dossier PENDING à la fois par membre — évite les soumissions en
-- doublon pendant qu'une demande est déjà en cours de traitement.
create unique index verification_requests_one_pending_per_user on verification_requests (user_id) where status = 'PENDING';

alter table verification_requests enable row level security;

create policy verification_requests_select on verification_requests
  for select to authenticated
  using (user_id = auth.uid() or is_admin_or_moderator(auth.uid()));

create policy verification_requests_insert_own on verification_requests
  for insert to authenticated
  with check (user_id = auth.uid());

-- Pas de policy update pour authenticated/anon : la décision (VERIFIED/REJECTED)
-- passe exclusivement par le client service_role (cf. admin.actions.ts), comme
-- le reste des mutations d'administration de ce projet.
