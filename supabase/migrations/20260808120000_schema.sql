-- ============================================================================
-- AGAPE — Schéma initial
-- Convention : la table `profiles` est volontairement large (1 ligne = 1 profil
-- complet) car ses champs sont quasi toujours lus/écrits ensemble et beaucoup
-- doivent être filtrables (arrays + GIN) par le moteur de découverte.
-- `profile_private` isole les données jamais destinées à d'autres utilisateurs
-- (téléphone) car PostgreSQL RLS filtre par ligne, pas par colonne : séparer
-- la table est le moyen le plus simple de garantir qu'un autre membre ne peut
-- jamais lire ce champ, même par erreur applicative.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type app_role as enum ('USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
create type gender_type as enum ('MALE', 'FEMALE');
create type relationship_status as enum ('AVAILABLE', 'IN_DISCUSSION', 'ON_PAUSE');
create type verification_status as enum ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

create type post_type as enum ('OFFICIAL', 'PERSONAL');
create type post_category as enum ('TEACHING', 'TESTIMONY', 'ADVICE', 'ANNOUNCEMENT', 'QUOTE', 'VERSE', 'NEWS');
create type post_media_type as enum ('IMAGE', 'GALLERY', 'VIDEO', 'QUOTE_CARD', 'TEXT_ONLY');

create type message_type as enum ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE', 'SYSTEM');
create type message_status as enum ('SENT', 'DELIVERED', 'READ');
create type attachment_type as enum ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

create type notification_type as enum (
  'NEW_MESSAGE', 'NEW_FAVORITE', 'PROFILE_VISIT', 'POST_LIKE',
  'POST_COMMENT', 'NEW_RECOMMENDATION', 'OFFICIAL_POST'
);

create type report_target_type as enum ('PROFILE', 'MESSAGE', 'POST');
create type report_status as enum ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'USER',

  -- Identité
  first_name text not null,
  last_name text not null default '',
  gender gender_type not null,
  birth_date date not null,
  city text,
  country text not null,
  profession text,
  education_level text,
  languages text[] not null default '{}',
  height_cm int,
  avatar_url text,
  bio text,
  quote text,
  status relationship_status not null default 'AVAILABLE',

  -- Ma foi
  church_denomination text,
  faith_engagement_level text,
  ministry text,
  faith_journey_years int,
  faith_description text,
  baptized boolean not null default false,
  community_engagement text,
  favorite_verse text,
  testimony text,
  current_god_action text,

  -- Personnalité
  personality_traits text[] not null default '{}',
  passions text[] not null default '{}',
  hobbies text[] not null default '{}',
  qualities text[] not null default '{}',
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',

  -- Vision du mariage
  why_marriage text,
  couple_vision text,
  family_vision text,
  has_children boolean not null default false,
  children_count int not null default 0,
  desired_children_count text,
  relocation_ready boolean not null default false,
  marriage_timeline text,
  core_values text[] not null default '{}',

  -- Recherche (préférences de partenaire)
  desired_age_min int not null default 18,
  desired_age_max int not null default 99,
  desired_countries text[] not null default '{}',
  desired_denomination text,
  desired_values text[] not null default '{}',
  desired_interests text[] not null default '{}',
  wants_children boolean,

  -- Confidentialité
  show_online_status boolean not null default true,
  show_read_receipts boolean not null default true,
  allow_profile_visits boolean not null default true,
  is_invisible_profile boolean not null default false,
  is_photo_blurred boolean not null default false,

  -- Préférences de notification
  notify_messages boolean not null default true,
  notify_favorites boolean not null default true,
  notify_recommendations boolean not null default true,
  notify_official_posts boolean not null default true,
  notify_comments boolean not null default true,
  notify_likes boolean not null default true,
  notify_profile_visits boolean not null default true,
  notify_email_digest boolean not null default false,

  -- Vérifications (jamais simulées : reflètent un vrai statut back-office)
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  photo_verification_status verification_status not null default 'UNVERIFIED',

  -- Géolocalisation (réservé — non exploité en V1, cf. roadmap distance)
  latitude double precision,
  longitude double precision,

  -- Onboarding
  onboarding_completed boolean not null default false,
  onboarding_step int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),

  constraint birth_date_plausible check (birth_date <= (now() - interval '18 years'))
);

create index profiles_gender_idx on profiles (gender);
create index profiles_country_idx on profiles (country);
create index profiles_birth_date_idx on profiles (birth_date);
create index profiles_passions_idx on profiles using gin (passions);
create index profiles_core_values_idx on profiles using gin (core_values);
create index profiles_languages_idx on profiles using gin (languages);
create index profiles_onboarding_idx on profiles (onboarding_completed);

comment on table profiles is 'Un profil = une ligne. Large et dénormalisée par choix (cf. en-tête du fichier).';

-- Données strictement privées (jamais lisibles par un autre membre)
create table profile_private (
  id uuid primary key references profiles (id) on delete cascade,
  phone text,
  phone_country_code text,
  created_at timestamptz not null default now()
);

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  url text not null,
  storage_path text not null,
  is_primary boolean not null default false,
  caption text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index profile_photos_profile_id_idx on profile_photos (profile_id);

-- ----------------------------------------------------------------------------
-- FAVORIS
-- ----------------------------------------------------------------------------
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  favorite_profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_no_self check (user_id <> favorite_profile_id),
  constraint favorites_unique unique (user_id, favorite_profile_id)
);

create index favorites_user_id_idx on favorites (user_id);

-- ----------------------------------------------------------------------------
-- PUBLICATIONS (fil officiel + publications personnelles dans une seule table
-- typée par `post_type` : le fil Accueil ne lit jamais que post_type='OFFICIAL',
-- le profil ne lit jamais que post_type='PERSONAL' — la séparation est
-- garantie à la fois par les requêtes applicatives ET par les policies RLS.)
-- ----------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id) on delete cascade,
  post_type post_type not null,
  category post_category,
  title text,
  content text not null,
  media_type post_media_type not null default 'TEXT_ONLY',
  video_url text,
  video_thumbnail text,
  quote_text text,
  quote_author text,
  likes_count int not null default 0,
  comments_count int not null default 0,
  shares_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_type_created_idx on posts (post_type, created_at desc);
create index posts_author_idx on posts (author_id, post_type);

create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  url text not null,
  storage_path text not null,
  position int not null default 0
);

create index post_media_post_id_idx on post_media (post_id);

create table post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index post_comments_post_id_idx on post_comments (post_id, created_at);

create table post_bookmarks (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MESSAGERIE
-- ----------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  is_favorite boolean not null default false,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx on conversation_participants (user_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  type message_type not null default 'TEXT',
  content text,
  status message_status not null default 'SENT',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_content_or_attachment check (
    type = 'SYSTEM' or content is not null or type in ('IMAGE', 'VIDEO', 'DOCUMENT', 'VOICE')
  )
);

create index messages_conversation_idx on messages (conversation_id, created_at);
create index messages_sender_idx on messages (sender_id);

create table message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  type attachment_type not null,
  storage_path text not null,
  url text,
  file_name text,
  size_bytes bigint,
  duration_seconds int,
  mime_type text
);

create index message_attachments_message_idx on message_attachments (message_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  type notification_type not null,
  title text not null,
  body text,
  target_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on notifications (recipient_id) where not is_read;

-- ----------------------------------------------------------------------------
-- VISITES DE PROFIL
-- ----------------------------------------------------------------------------
create table profile_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references profiles (id) on delete cascade,
  viewed_profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index profile_views_viewed_idx on profile_views (viewed_profile_id, created_at desc);

-- ----------------------------------------------------------------------------
-- SÉCURITÉ COMMUNAUTAIRE : blocages & signalements
-- ----------------------------------------------------------------------------
create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status report_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create index reports_status_idx on reports (status, created_at desc);
