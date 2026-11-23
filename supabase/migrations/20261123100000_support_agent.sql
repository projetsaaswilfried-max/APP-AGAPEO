-- Agent de support : escalade vers l'équipe et journal de ses actions.
--
-- Le support passe d'un canal humain (WhatsApp) à un assistant qui répond dans
-- les dossiers existants (`support_tickets` / `support_messages`). Rien n'est
-- remplacé côté stockage : l'assistant écrit un message `is_staff = true`
-- signé du compte « Équipe Agapeo », donc le déclencheur
-- `support_messages_notify_reply` prévient et pousse déjà le membre, la RLS
-- existante s'applique telle quelle, et l'inbox d'administration continue de
-- tout afficher. L'historique des 102 dossiers déjà ouverts est conservé.
--
-- Deux ajouts seulement :
--
-- 1. L'escalade. Quand l'assistant ne peut pas régler un cas, il marque le
--    dossier et l'équipe le voit immédiatement dans l'inbox, au lieu de devoir
--    relire tous les dossiers pour trouver ceux qui l'attendent.
--
-- 2. Le journal. Chaque outil que l'assistant exécute laisse une trace : quoi,
--    pour qui, avec quels arguments, et le résultat — y compris les REFUS.
--    C'est indispensable à trois titres : l'équipe peut auditer ce que
--    l'assistant a changé sur un compte, le code peut plafonner un outil par
--    jour et par membre (une demande répétée de changement de date de
--    naissance est refusée au-delà du plafond), et un abus éventuel est
--    reconstituable.

alter table public.support_tickets
  add column if not exists escalated_at timestamptz,
  add column if not exists escalation_reason text;

comment on column public.support_tickets.escalated_at is
  'Horodatage de l''escalade par l''assistant : le dossier attend une réponse humaine.';

create index if not exists support_tickets_escalated_idx
  on public.support_tickets (escalated_at desc)
  where escalated_at is not null;

create table if not exists public.support_agent_actions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.support_tickets(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  -- APPLIED : l'action a été exécutée. REFUSED : le code a refusé (conditions
  -- non réunies, plafond atteint) — l'assistant ne décide jamais seul d'un
  -- octroi. ERROR : échec technique.
  outcome text not null check (outcome in ('APPLIED', 'REFUSED', 'ERROR')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists support_agent_actions_user_tool_idx
  on public.support_agent_actions (user_id, tool, created_at desc);

create index if not exists support_agent_actions_ticket_idx
  on public.support_agent_actions (ticket_id, created_at desc);

alter table public.support_agent_actions enable row level security;

-- Lecture réservée à l'équipe : c'est un journal d'audit, pas une donnée
-- membre. Les écritures passent par la clé de service (l'assistant tourne
-- côté serveur).
drop policy if exists support_agent_actions_select_staff on public.support_agent_actions;
create policy support_agent_actions_select_staff on public.support_agent_actions
  for select
  using (public.is_admin_or_moderator(auth.uid()));
