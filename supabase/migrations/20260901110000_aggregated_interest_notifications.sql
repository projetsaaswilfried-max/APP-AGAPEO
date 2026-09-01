-- ============================================================================
-- Empile les notifications répétitives (likes, favoris, consultations de
-- profil) au lieu d'une notification par occurrence : tant que la dernière
-- notification d'un type donné n'a pas été lue, un nouvel évènement la met
-- à jour ("15 personnes ont aimé votre profil") plutôt que d'en créer une
-- nouvelle — dès qu'elle est lue, l'évènement suivant repart sur une
-- notification neuve à 1. Comme `notifications_send_push` ne se déclenche
-- qu'à l'INSERT (jamais à l'UPDATE), ceci réduit aussi mécaniquement le
-- volume de push envoyés, sans toucher à cette fonction.
-- ============================================================================

alter table notifications add column aggregate_count integer not null default 1;

comment on column notifications.aggregate_count is
  'Nombre d''occurrences empilées dans cette notification tant qu''elle reste non lue (ex: "15 personnes ont aimé votre profil") - repart à 1 dès qu''une nouvelle notification est créée après lecture de la précédente. Cf. upsert_aggregated_notification().';

create function upsert_aggregated_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type notification_type,
  p_target_url text,
  p_single_title text,
  p_plural_title_format text,
  p_body text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  existing_id uuid;
  existing_count int;
begin
  select id, aggregate_count into existing_id, existing_count
  from notifications
  where recipient_id = p_recipient_id
    and type = p_type
    and target_url is not distinct from p_target_url
    and not is_read
  order by created_at desc
  limit 1;

  if existing_id is not null then
    update notifications
    set aggregate_count = existing_count + 1,
        actor_id = p_actor_id,
        title = format(p_plural_title_format, existing_count + 1),
        body = p_body,
        created_at = now()
    where id = existing_id;
  else
    insert into notifications (recipient_id, actor_id, type, title, body, target_url, aggregate_count)
    values (p_recipient_id, p_actor_id, p_type, p_single_title, p_body, p_target_url, 1);
  end if;
end;
$$;

-- 1) Favoris
create or replace function notify_new_favorite()
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
    perform upsert_aggregated_notification(
      new.favorite_profile_id,
      new.user_id,
      'NEW_FAVORITE',
      '/discover',
      liker_name || ' vous a ajouté à ses favoris',
      '%s personnes vous ont ajouté à leurs favoris',
      null
    );
  end if;

  return new;
end;
$$;

-- 2) Likes (toujours anonymisé, y compris à la première occurrence — cf. migration profile_likes)
create or replace function notify_new_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform upsert_aggregated_notification(
    new.liked_profile_id,
    new.user_id,
    'PROFILE_LIKE',
    '/profile?tab=who-likes-me',
    'Quelqu''un a aimé votre profil',
    '%s personnes ont aimé votre profil',
    'Découvre qui grâce à Premium.'
  );

  return new;
end;
$$;

-- 3) Consultations de profil (reprend record_profile_view telle quelle, seule la notification finale change)
create or replace function record_profile_view(viewed_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  already_seen boolean;
  already_seen_this_month boolean;
  distinct_this_month int;
  viewer_is_exempt boolean;
  viewer_name text;
  wants_notif boolean;
  viewer_gender gender_type;
  viewed_gender gender_type;
begin
  if viewer is null or viewer = viewed_profile_id then
    return;
  end if;

  if is_blocked(viewer, viewed_profile_id) then
    return;
  end if;

  if not is_admin_or_moderator(viewer) then
    select gender into viewer_gender from profiles where id = viewer;
    select gender into viewed_gender from profiles where id = record_profile_view.viewed_profile_id;
    if viewer_gender is null or viewed_gender is null or viewer_gender = viewed_gender then
      return;
    end if;
  end if;

  select is_admin_or_moderator(viewer) or coalesce(
    (select subscription_status from profile_restricted where id = viewer) = 'ACTIVE', false
  ) into viewer_is_exempt;

  if not viewer_is_exempt then
    select exists (
      select 1 from profile_views
      where viewer_id = viewer
        and profile_views.viewed_profile_id = record_profile_view.viewed_profile_id
        and created_at >= date_trunc('month', now())
    ) into already_seen_this_month;

    if not already_seen_this_month then
      select count(distinct profile_views.viewed_profile_id) into distinct_this_month
      from profile_views
      where viewer_id = viewer and created_at >= date_trunc('month', now());

      if distinct_this_month >= 10 then
        raise exception 'MONTHLY_VIEW_LIMIT_REACHED';
      end if;
    end if;
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

  select allow_profile_visits into wants_notif from profiles where id = record_profile_view.viewed_profile_id;
  select first_name into viewer_name from profiles where id = viewer;

  if coalesce(wants_notif, true) then
    perform upsert_aggregated_notification(
      record_profile_view.viewed_profile_id,
      viewer,
      'PROFILE_VISIT',
      '/discover',
      viewer_name || ' a consulté votre profil',
      '%s personnes ont consulté votre profil',
      null
    );
  end if;
end;
$$;
