-- ============================================================================
-- Renforce en profondeur la règle "un homme ne voit/n'interagit qu'avec des
-- profils de femmes, et inversement" — déjà correctement appliquée dans la
-- requête principale de Découvrir (discover.service.ts::getProfiles(), 0
-- fuite constatée en direct), mais absente des autres points d'entrée qui
-- créent une interaction entre deux membres. Sans ce garde-fou, un profil
-- obtenu par un autre biais que Découvrir (URL directe, ID connu) pouvait
-- être mis en favori, consulté, ou contacté sans aucune vérification de
-- genre, même si Découvrir lui-même ne l'aurait jamais proposé.
-- ============================================================================

-- 1) Favoris : impossible de mettre en favori un profil du même genre.
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
  );

-- 2) Consultation de profil (record_profile_view, appelée par la fiche
-- profil publique) : un profil du même genre n'est jamais enregistré comme
-- "vu" ni ne déclenche de notification "X a consulté votre profil" —
-- silencieux (pas d'exception) comme les autres gardes déjà présents
-- (blocage, auto-consultation) juste au-dessus.
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

-- 3) Création de conversation : impossible de démarrer une conversation
-- avec un profil du même genre (aucune table `conversations` n'a de colonne
-- "autre participant" à contraindre via RLS classique — le garde-fou doit
-- donc vivre ici, seul point d'entrée réel de création de conversation,
-- cf. message.service.ts::getOrCreateConversation()).
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
begin
  if other_user_id = auth.uid() then
    raise exception 'Impossible de démarrer une conversation avec soi-même';
  end if;
  if is_blocked(auth.uid(), other_user_id) then
    raise exception 'Cette personne ne peut pas être contactée actuellement';
  end if;

  if not is_admin_or_moderator(auth.uid()) then
    select gender into requester_gender from profiles where id = auth.uid();
    select gender into other_gender from profiles where id = other_user_id;
    if requester_gender is null or other_gender is null or requester_gender = other_gender then
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
