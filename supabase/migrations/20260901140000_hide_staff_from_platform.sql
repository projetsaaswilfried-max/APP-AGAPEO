-- ============================================================================
-- L'équipe (admin/modérateur/CM...) ne doit plus jamais être visible ni
-- contactable par les autres membres, même via un profil vérifié ou une URL
-- directe — exactement le même principe de renfort déjà appliqué au genre
-- opposé (cf. strict_opposite_gender_matching.sql) : la requête de Découvrir
-- exclut déjà l'équipe (is_staff), on ferme ici les mêmes contournements
-- possibles (favoris, consultation, création de conversation, likes).
-- is_admin_or_moderator(auth.uid()) exempte toujours l'équipe elle-même, qui
-- doit pouvoir interagir librement pour modérer/tester.
-- ============================================================================

-- 1) Favoris
drop policy if exists favorites_insert_own on favorites;

create policy favorites_insert_own on favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_blocked(auth.uid(), favorite_profile_id)
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
    and (is_admin_or_moderator(auth.uid()) or (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED')
    and (
      is_admin_or_moderator(auth.uid())
      or (select gender from profiles where id = auth.uid()) <> (select gender from profiles where id = favorite_profile_id)
    )
    and (
      is_admin_or_moderator(auth.uid())
      or not coalesce((select is_staff from profiles where id = favorite_profile_id), false)
    )
  );

-- 2) Likes
drop policy if exists profile_likes_insert_own on profile_likes;

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
    and (
      is_admin_or_moderator(auth.uid())
      or not coalesce((select is_staff from profiles where id = liked_profile_id), false)
    )
  );

-- 3) Consultation de profil : un profil de l'équipe n'est jamais enregistré
-- comme "vu" ni ne déclenche de notification — silencieux, même principe que
-- le garde de genre juste au-dessus.
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
  viewed_is_staff boolean;
begin
  if viewer is null or viewer = viewed_profile_id then
    return;
  end if;

  if is_blocked(viewer, viewed_profile_id) then
    return;
  end if;

  if not is_admin_or_moderator(viewer) then
    select gender, is_staff into viewed_gender, viewed_is_staff from profiles where id = record_profile_view.viewed_profile_id;
    select gender into viewer_gender from profiles where id = viewer;
    if viewer_gender is null or viewed_gender is null or viewer_gender = viewed_gender or coalesce(viewed_is_staff, false) then
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

-- 4) Création de conversation
create or replace function create_conversation_with_participant(other_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  requester_name text;
  requester_gender gender_type;
  other_gender gender_type;
  other_is_staff boolean;
begin
  if other_user_id = auth.uid() then
    raise exception 'Impossible de démarrer une conversation avec soi-même';
  end if;
  if is_blocked(auth.uid(), other_user_id) then
    raise exception 'Cette personne ne peut pas être contactée actuellement';
  end if;

  if not is_admin_or_moderator(auth.uid()) then
    select gender, is_staff into other_gender, other_is_staff from profiles where id = other_user_id;
    select gender into requester_gender from profiles where id = auth.uid();
    if requester_gender is null or other_gender is null or requester_gender = other_gender or coalesce(other_is_staff, false) then
      raise exception 'Cette personne ne peut pas être contactée actuellement';
    end if;
  end if;

  insert into conversations (id, status, initiated_by) values (new_id, 'PENDING', auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (new_id, auth.uid());
  insert into conversation_participants (conversation_id, user_id) values (new_id, other_user_id);

  select first_name into requester_name from profiles where id = auth.uid();
  perform notify_conversation_invite(other_user_id, auth.uid(), new_id, requester_name);

  return new_id;
end;
$$;
