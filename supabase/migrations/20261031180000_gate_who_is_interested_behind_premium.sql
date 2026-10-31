-- « Qui s'intéresse à toi » est une fonctionnalité Premium, mais rien ne la
-- protégeait au niveau de la base : les politiques de lecture de `favorites`,
-- `profile_likes` et `profile_views` laissaient n'importe quel membre
-- authentifié lire toutes les lignes dont il est la CIBLE, donc l'identité de
-- chaque personne l'ayant mis en favori, liké ou visité. Le seul garde existant
-- (`discover.service.ts`) tourne dans le navigateur : il masque l'information
-- dans l'interface web mais ne protège rien. L'application mobile interroge
-- Supabase en direct (cf. §18 du PRD mobile) : la fonctionnalité y était donc
-- entièrement ouverte aux comptes gratuits.
--
-- Mesuré le 2026-10-31 sous l'identité RLS d'un membre réel en FREE :
-- 9 identités de favoris, 26 de likes, 53 de visites, toutes lisibles.
--
-- La lecture dans l'autre sens — « ce que MOI j'ai mis en favori / liké /
-- visité » — reste évidemment ouverte : c'est la donnée du membre lui-même, et
-- c'est tout ce dont se servent Découvrir, la fiche profil et l'historique de
-- visites (verifié : aucun autre appel de l'app ne lit la direction "cible").

-- Idiome identique à is_admin_or_moderator / is_blocked : STABLE SECURITY
-- DEFINER pour que la politique n'ait pas à dépendre de la RLS de
-- profile_restricted, search_path fixé.
create or replace function public.has_premium_access(uid uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(
    (select subscription_status = 'ACTIVE' from profile_restricted where id = uid),
    false
  );
$$;

-- Le NOMBRE de personnes intéressées reste volontairement gratuit (il sert à
-- la conversion) : il était jusqu'ici calculé côté client en lisant justement
-- les identités. Cette fonction le calcule en base, sans jamais les exposer.
-- La liste blanche reproduit EXACTEMENT celle de getWhoLikesMe() — genre
-- opposé, hors équipe, profil vérifié — pour que le compte annoncé corresponde
-- toujours au détail qui sera réellement affiché après abonnement.
create or replace function public.who_is_interested_count()
returns integer
language sql
stable security definer
set search_path to 'public'
as $$
  with moi as (
    select id, gender from profiles where id = auth.uid()
  ),
  interesses as (
    select f.user_id as id from favorites f, moi where f.favorite_profile_id = moi.id
    union
    select v.viewer_id as id from profile_views v, moi where v.viewed_profile_id = moi.id
    union
    select l.user_id as id from profile_likes l, moi where l.liked_profile_id = moi.id
  )
  select count(*)::integer
  from interesses i
  join profiles p on p.id = i.id
  cross join moi
  where p.gender = (case when moi.gender = 'MALE'::gender_type then 'FEMALE'::gender_type else 'MALE'::gender_type end)
    and coalesce(p.is_staff, false) = false
    and p.photo_verification_status = 'VERIFIED'::verification_status;
$$;

revoke all on function public.who_is_interested_count() from public;
grant execute on function public.who_is_interested_count() to authenticated;

-- favorites : `favorites_select_own` (user_id = auth.uid()) reste intacte et
-- couvre toute la direction "ce que j'ai mis en favori" ; seule la direction
-- "qui m'a mis en favori" passe derrière l'abonnement.
drop policy if exists favorites_select_as_favorited on favorites;
create policy favorites_select_as_favorited on favorites
  for select
  using (
    favorite_profile_id = auth.uid()
    and (is_admin_or_moderator(auth.uid()) or has_premium_access(auth.uid()))
  );

drop policy if exists profile_likes_select on profile_likes;
create policy profile_likes_select on profile_likes
  for select
  using (
    user_id = auth.uid()
    or (liked_profile_id = auth.uid() and (is_admin_or_moderator(auth.uid()) or has_premium_access(auth.uid())))
  );

drop policy if exists profile_views_select on profile_views;
create policy profile_views_select on profile_views
  for select
  using (
    viewer_id = auth.uid()
    or (viewed_profile_id = auth.uid() and (is_admin_or_moderator(auth.uid()) or has_premium_access(auth.uid())))
  );
