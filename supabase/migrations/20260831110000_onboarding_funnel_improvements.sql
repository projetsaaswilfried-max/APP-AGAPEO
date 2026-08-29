-- ============================================================================
-- Amélioration du taux de complétion de l'onboarding (moins de gens
-- abandonnent avant de soumettre leur profil pour vérification) :
--
-- 1. `profiles.pending_selfie_storage_path` : permet de capturer le selfie
--    de vérification PLUS TÔT dans l'assistant (juste après les photos)
--    plutôt qu'à la toute fin, après le champ "pourquoi le mariage" — évite
--    d'empiler les deux étapes les plus exigeantes au moment où la
--    motivation est la plus fragile. Stocké ici en attendant la soumission
--    réelle (`submitVerificationRequestAction`), qui le consomme et le vide.
-- 2. `onboarding_events` : suivi minimal, par étape, de la progression dans
--    l'assistant — sans ça, impossible de savoir où les gens abandonnent
--    (aucun suivi de ce niveau n'existait avant, seulement inscription vs
--    achat Premium côté Meta Pixel).
-- 3. `profile_restricted.almost_done_nudge_sent` : une relance email dédiée,
--    distincte de la séquence J1/J3/J5/J7, pour les membres dont le profil
--    est déjà complet (photo + confession + vision du mariage) mais qui
--    n'ont toujours pas soumis — un message bien plus motivant ("il ne te
--    reste qu'un selfie") qu'une relance générique.
-- ============================================================================

alter table profiles add column pending_selfie_storage_path text;

comment on column profiles.pending_selfie_storage_path is
  'Selfie capturé tôt dans l''onboarding (étape dédiée, juste après les photos), en attente de la soumission réelle pour vérification — vidé une fois consommé par submitVerificationRequestAction.';

alter table profile_restricted add column almost_done_nudge_sent boolean not null default false;

comment on column profile_restricted.almost_done_nudge_sent is
  'Vrai une fois la relance dédiée "il ne te reste qu''un selfie" envoyée — jamais renvoyée deux fois, indépendante des paliers J1/J3/J5/J7.';

create table onboarding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  event_type text not null check (event_type in ('STEP_VIEWED', 'SELFIE_CAMERA_DENIED', 'SELFIE_CAPTURED', 'VERIFICATION_SUBMITTED')),
  step_key text,
  created_at timestamptz not null default now()
);

create index onboarding_events_user_idx on onboarding_events (user_id);
create index onboarding_events_type_created_idx on onboarding_events (event_type, created_at);

alter table onboarding_events enable row level security;

create policy onboarding_events_insert_own on onboarding_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- Lecture réservée à l'équipe : c'est un outil de pilotage produit, jamais
-- une donnée qu'un membre a besoin de consulter sur lui-même.
create policy onboarding_events_select_staff on onboarding_events
  for select to authenticated
  using (is_admin_or_moderator(auth.uid()));
