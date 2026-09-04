-- ============================================================================
-- Consulter une fiche profil complète est désormais réservé Premium (et
-- l'équipe), sans grâce mensuelle — remplace l'ancienne limite de 10 fiches
-- gratuites/mois par un blocage systématique pour tout viewer non exempté.
-- Garde le même message d'exception (MONTHLY_VIEW_LIMIT_REACHED) pour ne pas
-- casser la détection déjà en place côté client (profile-drawer-inspector.tsx).
-- ============================================================================

create or replace function record_profile_view(viewed_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  already_seen boolean;
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
    raise exception 'MONTHLY_VIEW_LIMIT_REACHED';
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
