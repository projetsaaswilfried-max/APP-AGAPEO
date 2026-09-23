-- ============================================================================
-- Table de référence "centres d'intérêt" — remplace la liste figée dans le
-- code (src/config/interest-options.ts, gardée pour MAX_INTERESTS et
-- resolveInterests, qui normalisent l'ancien champ hobbies en texte libre).
-- Gérable depuis l'espace admin (ADMIN+), lisible sans authentification —
-- c'est une simple liste de référence, pas une donnée personnelle.
--
-- `id` est un slug texte stable (ex. "jeux-video"), choisi une fois à la
-- création et jamais recalculé ensuite : renommer un centre d'intérêt ne
-- change que `name`, jamais son identifiant.
-- ============================================================================

create table interests (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger interests_touch_updated_at
  before update on interests
  for each row execute function touch_updated_at();

alter table interests enable row level security;

-- Lecture publique, y compris non authentifiée (ex. app mobile avant connexion).
create policy interests_select_public on interests
  for select
  to anon, authenticated
  using (true);

-- Écriture réservée à l'équipe. RLS autorise ici MODERATOR+ (comme le reste
-- des policies "admin" de ce projet, cf. posts_insert) ; l'accès réel est
-- resserré à ADMIN+ au niveau des actions/page (requireAdminSession), même
-- principe que le fil officiel.
create policy interests_write_staff on interests
  for all
  to authenticated
  using (is_admin_or_moderator(auth.uid()))
  with check (is_admin_or_moderator(auth.uid()));

-- Seed : les 23 options déjà utilisées en production (cf. INTEREST_OPTIONS),
-- construites à partir d'un relevé réel de 8994 profils — voir le
-- commentaire de src/config/interest-options.ts pour la méthode.
insert into interests (id, name) values
  ('cuisine', 'Cuisine'),
  ('musique', 'Musique'),
  ('lecture', 'Lecture'),
  ('sport', 'Sport'),
  ('voyage', 'Voyage'),
  ('football', 'Football'),
  ('cinema', 'Cinéma'),
  ('randonnee', 'Randonnée'),
  ('danse', 'Danse'),
  ('chant', 'Chant'),
  ('promenade', 'Promenade'),
  ('sortie', 'Sortie'),
  ('decouverte', 'Découverte'),
  ('jeux-video', 'Jeux vidéo'),
  ('priere', 'Prière'),
  ('meditation', 'Méditation'),
  ('basketball', 'Basketball'),
  ('natation', 'Natation'),
  ('shopping', 'Shopping'),
  ('nature', 'Nature'),
  ('plage', 'Plage'),
  ('restaurant', 'Restaurant'),
  ('bricolage', 'Bricolage')
on conflict (id) do nothing;
