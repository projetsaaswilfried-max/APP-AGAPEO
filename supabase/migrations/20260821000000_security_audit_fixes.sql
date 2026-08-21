-- ============================================================================
-- Corrections suite à un audit de sécurité/logique métier approfondi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) CRITIQUE : n'importe quel participant d'une conversation pouvait
--    supprimer/vider le contenu d'un message envoyé par L'AUTRE (la policy
--    `messages_update` vérifiait seulement l'appartenance à la conversation,
--    jamais qui est l'auteur du message modifié). Seul l'auteur peut
--    désormais toucher `content`/`deleted_at` ; le statut/l'accusé de
--    lecture restent modifiables par l'autre participant comme avant.
-- ----------------------------------------------------------------------------
create or replace function guard_message_update()
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

  if (new.deleted_at is distinct from old.deleted_at or new.content is distinct from old.content)
    and auth.uid() <> old.sender_id then
    raise exception 'Seul l''auteur d''un message peut le supprimer';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) `record_profile_view()` ne vérifiait jamais le blocage — un membre
--    bloqué pouvait quand même déclencher un enregistrement de visite (et la
--    notification "X a consulté votre profil") en appelant le RPC
--    directement, alors que la page de profil elle-même lui est fermée.
--    En profite pour corriger `allow_profile_visits` : la colonne était
--    lue mais jamais utilisée (c'est `notify_profile_visits`, jamais exposé
--    dans les réglages, qui gatait la notification à tort).
-- ----------------------------------------------------------------------------
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
begin
  if viewer is null or viewer = viewed_profile_id then
    return;
  end if;

  if is_blocked(viewer, viewed_profile_id) then
    return;
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

-- ----------------------------------------------------------------------------
-- 3) `post_shares` était le seul type d'interaction sur les posts à ne pas
--    vérifier le blocage (contrairement à post_likes_insert/post_comments_insert).
-- ----------------------------------------------------------------------------
drop policy if exists post_shares_insert_own on post_shares;

create policy post_shares_insert_own on post_shares
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = post_shares.post_id
        and (p.post_type = 'OFFICIAL' or not is_blocked(auth.uid(), p.author_id))
    )
  );
