-- ============================================================================
-- Nombre de vues des publications (posts) — même principe que profile_views
-- (dédupliqué 12h, l'auteur ne compte jamais comme vue de son propre post),
-- compteur dénormalisé sur `posts` maintenu par trigger comme
-- likes_count/comments_count/shares_count (cf. sync_post_likes_count).
-- ============================================================================
alter table posts add column views_count int not null default 0;

create table post_views (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references profiles (id) on delete cascade,
  post_id uuid not null references posts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index post_views_post_idx on post_views (post_id, created_at desc);
create index post_views_viewer_post_idx on post_views (viewer_id, post_id, created_at desc);

alter table post_views enable row level security;

-- Jamais d'insert direct depuis le client (dédoublonnage + exclusion de
-- l'auteur gérés dans record_post_view, security definer, ci-dessous) —
-- lecture réservée à l'auteur du post, comme post_likes_select. Le compteur
-- public views_count sur `posts` suffit à tout le monde d'autre.
create policy post_views_select_own on post_views
  for select to authenticated
  using (exists (select 1 from posts p where p.id = post_views.post_id and p.author_id = auth.uid()));

create function sync_post_views_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update posts set views_count = views_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger post_views_sync_count
  after insert on post_views
  for each row execute function sync_post_views_count();

-- Appelée côté client (supabase.rpc), même convention que record_profile_view.
create function record_post_view(post_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  post_author uuid;
  already_seen boolean;
begin
  if viewer is null then
    return;
  end if;

  select author_id into post_author from posts where id = record_post_view.post_id;
  if post_author is null or post_author = viewer then
    return;
  end if;

  select exists (
    select 1 from post_views
    where viewer_id = viewer
      and post_views.post_id = record_post_view.post_id
      and created_at > now() - interval '12 hours'
  ) into already_seen;

  if already_seen then
    return;
  end if;

  insert into post_views (viewer_id, post_id) values (viewer, record_post_view.post_id);
end;
$$;
