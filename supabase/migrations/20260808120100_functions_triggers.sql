-- ============================================================================
-- Fonctions & triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription.
-- Les champs obligatoires (prénom, genre, date de naissance, pays) sont
-- capturés dans le formulaire d'inscription et transmis via raw_user_meta_data
-- lors de l'appel à supabase.auth.signUp() — validés côté serveur (Zod) avant
-- l'appel, donc jamais de valeur factice ici.
-- ----------------------------------------------------------------------------
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, gender, birth_date, country, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    (new.raw_user_meta_data ->> 'gender')::gender_type,
    (new.raw_user_meta_data ->> 'birth_date')::date,
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    new.email_confirmed_at is not null
  );

  insert into public.profile_private (id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Garde `profiles.email_verified` synchronisé quand Supabase Auth confirme l'email.
create function sync_email_verified()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row execute function sync_email_verified();

-- ----------------------------------------------------------------------------
-- updated_at générique
-- ----------------------------------------------------------------------------
create function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function touch_updated_at();

create trigger posts_touch_updated_at
  before update on posts
  for each row execute function touch_updated_at();

-- ----------------------------------------------------------------------------
-- Compteurs dénormalisés sur `posts` (évite un count(*) à chaque affichage)
-- ----------------------------------------------------------------------------
create function sync_post_likes_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger post_likes_sync_count
  after insert or delete on post_likes
  for each row execute function sync_post_likes_count();

create function sync_post_comments_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger post_comments_sync_count
  after insert or delete on post_comments
  for each row execute function sync_post_comments_count();

create function sync_post_shares_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update posts set shares_count = shares_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger post_shares_sync_count
  after insert on post_shares
  for each row execute function sync_post_shares_count();

-- ----------------------------------------------------------------------------
-- Messagerie : dernier message + notifications
-- ----------------------------------------------------------------------------
create function touch_conversation_last_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation_last_message();

create function notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  recipient record;
begin
  select first_name into sender_name from profiles where id = new.sender_id;

  for recipient in
    select cp.user_id, p.notify_messages
    from conversation_participants cp
    join profiles p on p.id = cp.user_id
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    if recipient.notify_messages then
      insert into notifications (recipient_id, actor_id, type, title, body, target_url)
      values (
        recipient.user_id,
        new.sender_id,
        'NEW_MESSAGE',
        sender_name || ' vous a envoyé un message',
        case
          when new.type = 'TEXT' then left(coalesce(new.content, ''), 140)
          when new.type = 'IMAGE' then 'A envoyé une photo'
          when new.type = 'VIDEO' then 'A envoyé une vidéo'
          when new.type = 'DOCUMENT' then 'A envoyé un document'
          when new.type = 'VOICE' then 'A envoyé un message vocal'
          else ''
        end,
        '/messages?conversation=' || new.conversation_id
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger messages_notify_recipients
  after insert on messages
  for each row execute function notify_new_message();

-- ----------------------------------------------------------------------------
-- Publications personnelles : notifications de like / commentaire
-- (Volontairement limité à post_type = 'PERSONAL' : le fil officiel appartient
-- à l'équipe et n'a pas besoin d'une notification par interaction individuelle.)
-- ----------------------------------------------------------------------------
create function notify_post_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_post posts%rowtype;
  liker_name text;
  wants_notif boolean;
begin
  select * into target_post from posts where id = new.post_id;

  if target_post.post_type = 'PERSONAL' and target_post.author_id <> new.user_id then
    select notify_likes into wants_notif from profiles where id = target_post.author_id;
    select first_name into liker_name from profiles where id = new.user_id;

    if wants_notif then
      insert into notifications (recipient_id, actor_id, type, title, body, target_url)
      values (
        target_post.author_id,
        new.user_id,
        'POST_LIKE',
        liker_name || ' a aimé votre publication',
        left(target_post.content, 140),
        '/profile'
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger post_likes_notify
  after insert on post_likes
  for each row execute function notify_post_like();

create function notify_post_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_post posts%rowtype;
  commenter_name text;
  wants_notif boolean;
begin
  select * into target_post from posts where id = new.post_id;

  if target_post.post_type = 'PERSONAL' and target_post.author_id <> new.author_id then
    select notify_comments into wants_notif from profiles where id = target_post.author_id;
    select first_name into commenter_name from profiles where id = new.author_id;

    if wants_notif then
      insert into notifications (recipient_id, actor_id, type, title, body, target_url)
      values (
        target_post.author_id,
        new.author_id,
        'POST_COMMENT',
        commenter_name || ' a commenté votre publication',
        left(new.content, 140),
        '/profile'
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger post_comments_notify
  after insert on post_comments
  for each row execute function notify_post_comment();

-- ----------------------------------------------------------------------------
-- Nouvelle publication officielle : notifie tous les membres abonnés.
-- Acceptable en V1 (fan-out synchrone) vu la taille attendue de la
-- communauté ; à déplacer vers une file asynchrone si le volume grandit.
-- ----------------------------------------------------------------------------
create function notify_official_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.post_type = 'OFFICIAL' then
    insert into notifications (recipient_id, actor_id, type, title, body, target_url)
    select id, new.author_id, 'OFFICIAL_POST', 'Nouvelle publication officielle', left(new.content, 140), '/'
    from profiles
    where notify_official_posts = true and id <> new.author_id;
  end if;
  return new;
end;
$$;

create trigger posts_notify_official
  after insert on posts
  for each row execute function notify_official_post();

-- ----------------------------------------------------------------------------
-- Favoris : notifier la personne ajoutée en favori
-- ----------------------------------------------------------------------------
create function notify_new_favorite()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  liker_name text;
  wants_notif boolean;
begin
  select notify_favorites into wants_notif from profiles where id = new.favorite_profile_id;
  select first_name into liker_name from profiles where id = new.user_id;

  if wants_notif then
    insert into notifications (recipient_id, actor_id, type, title, body, target_url)
    values (
      new.favorite_profile_id,
      new.user_id,
      'NEW_FAVORITE',
      liker_name || ' vous a ajouté à ses favoris',
      null,
      '/discover'
    );
  end if;

  return new;
end;
$$;

create trigger favorites_notify
  after insert on favorites
  for each row execute function notify_new_favorite();

-- ----------------------------------------------------------------------------
-- Visite de profil : RPC appelée par le client quand une fiche est ouverte.
-- Throttlée à une visite comptabilisée par 12h et par paire (évite le spam
-- de notifications si quelqu'un rouvre la fiche en boucle).
-- ----------------------------------------------------------------------------
create function record_profile_view(viewed_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  already_seen boolean;
  viewer_name text;
  wants_notif boolean;
  allow_visits boolean;
begin
  if viewer is null or viewer = viewed_profile_id then
    return;
  end if;

  select exists (
    select 1 from profile_views
    where viewer_id = viewer
      and profile_views.viewed_profile_id = record_profile_view.viewed_profile_id
      and created_at > now() - interval '12 hours'
  ) into already_seen;

  if already_seen then
    return;
  end if;

  insert into profile_views (viewer_id, viewed_profile_id)
  values (viewer, record_profile_view.viewed_profile_id);

  select allow_profile_visits, notify_profile_visits
    into allow_visits, wants_notif
    from profiles where id = record_profile_view.viewed_profile_id;

  select first_name into viewer_name from profiles where id = viewer;

  if coalesce(wants_notif, true) then
    insert into notifications (recipient_id, actor_id, type, title, body, target_url)
    values (
      record_profile_view.viewed_profile_id,
      viewer,
      'PROFILE_VISIT',
      viewer_name || ' a consulté votre profil',
      null,
      '/discover'
    );
  end if;
end;
$$;
