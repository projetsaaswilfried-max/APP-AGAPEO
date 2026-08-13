-- ============================================================================
-- Row Level Security — chaque table est verrouillée par défaut ; seules les
-- policies ci-dessous ouvrent un accès explicite. Rien ne doit dépendre d'un
-- contrôle frontend seul (règle 17 du cahier des charges).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonctions utilitaires (SECURITY DEFINER pour éviter toute récursion RLS
-- quand une policy a besoin de lire une autre ligne que la sienne).
-- ----------------------------------------------------------------------------
create function is_admin_or_moderator(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role in ('ADMIN', 'SUPER_ADMIN', 'MODERATOR') from profiles where id = uid),
    false
  );
$$;

create function is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create function is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = conv_id and cp.user_id = uid
  );
$$;

-- Empêche un utilisateur standard de s'auto-attribuer un rôle ou de forger
-- ses propres statuts de vérification depuis le client.
create function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Modification du rôle non autorisée';
  end if;
  if new.email_verified is distinct from old.email_verified
    or new.phone_verified is distinct from old.phone_verified
    or new.photo_verification_status is distinct from old.photo_verification_status then
    raise exception 'Modification des statuts de vérification non autorisée';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on profiles
  for each row execute function protect_privileged_profile_columns();

-- Une fois envoyé, un message est immuable à part son statut et sa suppression douce.
create function guard_message_update()
returns trigger
language plpgsql
as $$
begin
  if new.conversation_id <> old.conversation_id
    or new.sender_id <> old.sender_id
    or new.type <> old.type
    or coalesce(new.content, '') <> coalesce(old.content, '') and new.deleted_at is null then
    raise exception 'Seuls le statut et la suppression d''un message peuvent être modifiés';
  end if;
  return new;
end;
$$;

create trigger messages_guard_update
  before update on messages
  for each row execute function guard_message_update();

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or (not is_invisible_profile and not is_blocked(auth.uid(), id))
  );

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

alter table profile_private enable row level security;

create policy profile_private_select_own on profile_private
  for select to authenticated
  using (id = auth.uid());

create policy profile_private_update_own on profile_private
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

alter table profile_photos enable row level security;

create policy profile_photos_select on profile_photos
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = profile_photos.profile_id
        and (p.id = auth.uid() or (not p.is_invisible_profile and not is_blocked(auth.uid(), p.id)))
    )
  );

create policy profile_photos_write_own on profile_photos
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- FAVORIS
-- ----------------------------------------------------------------------------
alter table favorites enable row level security;

create policy favorites_select_own on favorites
  for select to authenticated
  using (user_id = auth.uid());

create policy favorites_insert_own on favorites
  for insert to authenticated
  with check (user_id = auth.uid() and not is_blocked(auth.uid(), favorite_profile_id));

create policy favorites_delete_own on favorites
  for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- PUBLICATIONS
-- ----------------------------------------------------------------------------
alter table posts enable row level security;

create policy posts_select on posts
  for select to authenticated
  using (
    post_type = 'OFFICIAL'
    or author_id = auth.uid()
    or not is_blocked(auth.uid(), author_id)
  );

create policy posts_insert on posts
  for insert to authenticated
  with check (
    (post_type = 'PERSONAL' and author_id = auth.uid())
    or (post_type = 'OFFICIAL' and author_id = auth.uid() and is_admin_or_moderator(auth.uid()))
  );

create policy posts_update on posts
  for update to authenticated
  using (
    (post_type = 'PERSONAL' and author_id = auth.uid())
    or (post_type = 'OFFICIAL' and is_admin_or_moderator(auth.uid()))
  );

create policy posts_delete on posts
  for delete to authenticated
  using (
    (post_type = 'PERSONAL' and author_id = auth.uid())
    or (post_type = 'OFFICIAL' and is_admin_or_moderator(auth.uid()))
  );

alter table post_media enable row level security;

create policy post_media_select on post_media
  for select to authenticated
  using (exists (
    select 1 from posts p where p.id = post_media.post_id
      and (p.post_type = 'OFFICIAL' or p.author_id = auth.uid() or not is_blocked(auth.uid(), p.author_id))
  ));

create policy post_media_write on post_media
  for all to authenticated
  using (exists (
    select 1 from posts p where p.id = post_media.post_id
      and (p.author_id = auth.uid() or (p.post_type = 'OFFICIAL' and is_admin_or_moderator(auth.uid())))
  ))
  with check (exists (
    select 1 from posts p where p.id = post_media.post_id
      and (p.author_id = auth.uid() or (p.post_type = 'OFFICIAL' and is_admin_or_moderator(auth.uid())))
  ));

alter table post_likes enable row level security;

create policy post_likes_select on post_likes
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from posts p where p.id = post_likes.post_id and p.author_id = auth.uid())
  );

create policy post_likes_insert on post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p where p.id = post_likes.post_id
        and (p.post_type = 'OFFICIAL' or not is_blocked(auth.uid(), p.author_id))
    )
  );

create policy post_likes_delete on post_likes
  for delete to authenticated
  using (user_id = auth.uid());

alter table post_comments enable row level security;

create policy post_comments_select on post_comments
  for select to authenticated
  using (exists (
    select 1 from posts p where p.id = post_comments.post_id
      and (p.post_type = 'OFFICIAL' or p.author_id = auth.uid() or not is_blocked(auth.uid(), p.author_id))
  ));

create policy post_comments_insert on post_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from posts p where p.id = post_comments.post_id
        and (p.post_type = 'OFFICIAL' or not is_blocked(auth.uid(), p.author_id))
    )
  );

create policy post_comments_delete on post_comments
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from posts p where p.id = post_comments.post_id and p.author_id = auth.uid())
    or is_admin_or_moderator(auth.uid())
  );

alter table post_bookmarks enable row level security;

create policy post_bookmarks_all_own on post_bookmarks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table post_shares enable row level security;

create policy post_shares_select_own on post_shares
  for select to authenticated
  using (user_id = auth.uid());

create policy post_shares_insert_own on post_shares
  for insert to authenticated
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- MESSAGERIE
-- ----------------------------------------------------------------------------
alter table conversations enable row level security;

create policy conversations_select on conversations
  for select to authenticated
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
  ));

create policy conversations_insert on conversations
  for insert to authenticated
  with check (true);

alter table conversation_participants enable row level security;

-- Passe par une fonction SECURITY DEFINER plutôt qu'une auto-jointure directe :
-- une policy de `conversation_participants` qui interroge `conversation_participants`
-- déclenche "infinite recursion detected in policy" (42P17) dès que RLS est évaluée
-- sur cette table — y compris indirectement via les policies Storage des pièces
-- jointes de messagerie, qui référencent aussi cette table.
create policy conversation_participants_select on conversation_participants
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_conversation_participant(conversation_id, auth.uid())
  );

create policy conversation_participants_insert on conversation_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or (
      not is_blocked(auth.uid(), user_id)
      and is_conversation_participant(conversation_id, auth.uid())
    )
  );

create policy conversation_participants_update_own on conversation_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table messages enable row level security;

create policy messages_select on messages
  for select to authenticated
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
    and not exists (
      select 1 from conversation_participants other
      where other.conversation_id = messages.conversation_id
        and other.user_id <> auth.uid()
        and is_blocked(auth.uid(), other.user_id)
    )
  );

create policy messages_update on messages
  for update to authenticated
  using (exists (
    select 1 from conversation_participants cp
    where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
  ));

alter table message_attachments enable row level security;

create policy message_attachments_select on message_attachments
  for select to authenticated
  using (exists (
    select 1 from messages m
    join conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_attachments.message_id and cp.user_id = auth.uid()
  ));

create policy message_attachments_insert on message_attachments
  for insert to authenticated
  with check (exists (
    select 1 from messages m where m.id = message_attachments.message_id and m.sender_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

create policy notifications_select_own on notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy notifications_update_own on notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy notifications_delete_own on notifications
  for delete to authenticated
  using (recipient_id = auth.uid());

-- ----------------------------------------------------------------------------
-- VISITES DE PROFIL (écriture uniquement via la RPC security definer)
-- ----------------------------------------------------------------------------
alter table profile_views enable row level security;

create policy profile_views_select on profile_views
  for select to authenticated
  using (viewer_id = auth.uid() or viewed_profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- BLOCAGES & SIGNALEMENTS
-- ----------------------------------------------------------------------------
alter table blocks enable row level security;

create policy blocks_select_own on blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create policy blocks_insert_own on blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy blocks_delete_own on blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

alter table reports enable row level security;

create policy reports_select on reports
  for select to authenticated
  using (reporter_id = auth.uid() or is_admin_or_moderator(auth.uid()));

create policy reports_insert on reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_update_moderation on reports
  for update to authenticated
  using (is_admin_or_moderator(auth.uid()));
