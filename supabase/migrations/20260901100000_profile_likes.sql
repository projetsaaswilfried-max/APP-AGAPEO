-- ============================================================================
-- Bouton "liker un profil" depuis Découvrir — distinct des favoris : action
-- gratuite (accessible à tout membre vérifié, contrairement aux favoris qui
-- exigent un accès actif), notification TOUJOURS anonymisée pour le
-- destinataire ("Quelqu'un a aimé votre profil", jamais le nom) — qui doit
-- passer par "Qui s'intéresse à moi" (déjà premium-gated, cf.
-- discover.service.ts::getWhoLikesMe) pour découvrir qui. profile_likes
-- vient s'ajouter à favorites/profile_views comme troisième source de ce
-- même écran, jamais un système parallèle séparé.
-- ============================================================================

create table profile_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  liked_profile_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_likes_distinct_users check (user_id <> liked_profile_id),
  unique (user_id, liked_profile_id)
);

create index profile_likes_liked_profile_idx on profile_likes (liked_profile_id);
create index profile_likes_user_idx on profile_likes (user_id);

alter table profile_likes enable row level security;

create policy profile_likes_select on profile_likes
  for select to authenticated
  using (user_id = auth.uid() or liked_profile_id = auth.uid());

-- Gratuit pour tout membre vérifié (contrairement aux favoris) : c'est
-- justement l'action gratuite qui alimente les notifications faisant
-- découvrir Premium. Même règle stricte de genre opposé que
-- favorites/conversations (cf. migration strict_opposite_gender_matching).
create policy profile_likes_insert_own on profile_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_blocked(auth.uid(), liked_profile_id)
    and (is_admin_or_moderator(auth.uid()) or (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED')
    and (
      is_admin_or_moderator(auth.uid())
      or (select gender from profiles where id = auth.uid()) <> (select gender from profiles where id = liked_profile_id)
    )
  );

create policy profile_likes_delete_own on profile_likes
  for delete to authenticated
  using (user_id = auth.uid());

create function notify_new_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, type, title, body, target_url)
  values (
    new.liked_profile_id,
    new.user_id,
    'PROFILE_LIKE',
    'Quelqu''un a aimé votre profil',
    'Découvre qui grâce à Premium.',
    '/profile?tab=who-likes-me'
  );

  return new;
end;
$$;

create trigger profile_likes_notify
  after insert on profile_likes
  for each row execute function notify_new_like();
