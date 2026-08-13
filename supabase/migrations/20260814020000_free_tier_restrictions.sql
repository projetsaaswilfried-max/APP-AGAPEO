-- ============================================================================
-- Restrictions supplémentaires du plan gratuit, demandées après la première
-- vague de gating Premium :
-- 1) Un membre gratuit peut recevoir des messages mais ne peut plus RÉPONDRE
--    (envoi de n'importe quel message désormais réservé Premium/staff).
-- 2) Mettre un profil en favori devient une fonctionnalité Premium.
-- 3) Un membre gratuit ne peut consulter que 10 profils DISTINCTS par mois
--    (le mois calendaire) — au-delà, record_profile_view() lève une erreur.
-- 4) Les profils Premium sont mis en avant dans Découvrir : un booléen public
--    `profiles.is_premium` (même principe que `is_staff`, synchronisé depuis
--    `profile_restricted.subscription_status`) permet de trier sans exposer
--    le statut d'abonnement exact d'autrui.
-- ============================================================================

drop policy if exists messages_insert on messages;

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
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

drop policy if exists favorites_insert_own on favorites;

create policy favorites_insert_own on favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and not is_blocked(auth.uid(), favorite_profile_id)
    and (is_admin_or_moderator(auth.uid()) or (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE')
  );

-- ----------------------------------------------------------------------------
-- Limite de consultation de profils (10 distincts/mois pour les gratuits)
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
  allow_visits boolean;
begin
  if viewer is null or viewer = viewed_profile_id then
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

-- ----------------------------------------------------------------------------
-- Badge public "Premium" (même principe que `is_staff`) — permet de trier
-- Découvrir sans exposer subscription_status/plan/période à d'autres membres.
-- ----------------------------------------------------------------------------
alter table profiles add column is_premium boolean not null default false;

update profiles p set is_premium = (pr.subscription_status = 'ACTIVE')
from profile_restricted pr
where pr.id = p.id;

create function sync_profile_is_premium()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update profiles set is_premium = (new.subscription_status = 'ACTIVE') where id = new.id;
  return new;
end;
$$;

create trigger profile_restricted_sync_is_premium
  after insert or update of subscription_status on profile_restricted
  for each row execute function sync_profile_is_premium();
