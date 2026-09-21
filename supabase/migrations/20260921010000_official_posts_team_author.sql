-- ============================================================================
-- Les publications officielles sont signées "Équipe Agapeo" à la source.
--
-- Le fil web affichait déjà "Équipe Agapeo" (feed.mapper.ts remplace le nom
-- dès que post_type = OFFICIAL), mais l'application mobile lit `posts.author_id`
-- puis le profil de cet auteur — elle affichait donc le vrai nom de la
-- personne qui avait publié. La règle est portée ici par la base pour que
-- tous les clients (web, mobile, scripts) la respectent, sans dépendre d'un
-- déploiement :
--   * tout post OFFICIAL est rattaché au compte d'équipe, celui déjà utilisé
--     pour les messages automatiques (cf. src/domain/system-account.ts),
--     renommé ici "Équipe Agapeo" ;
--   * `published_by` garde la trace de qui a réellement publié (attribution
--     interne) et sert à ne pas notifier la personne qui publie elle-même.
--
-- Le compte d'équipe n'existe que dans la base de production : chaque étape
-- qui le référence est sans effet si le profil est absent (autre environnement).
-- ============================================================================

alter table posts add column published_by uuid references profiles(id) on delete set null;

-- Avant réattribution, l'auteur actuel d'un post officiel EST la personne qui l'a publié.
update posts set published_by = author_id where post_type = 'OFFICIAL';

update profiles
   set first_name = 'Équipe Agapeo'
 where id = '8d736a66-2597-4f48-b70b-08e6f7059c89';

update posts
   set author_id = '8d736a66-2597-4f48-b70b-08e6f7059c89'
 where post_type = 'OFFICIAL'
   and author_id <> '8d736a66-2597-4f48-b70b-08e6f7059c89'
   and exists (select 1 from profiles where id = '8d736a66-2597-4f48-b70b-08e6f7059c89');

-- ---------------------------------------------------------------------------
-- Les posts officiels à venir : le trigger réécrit l'auteur et mémorise le
-- vrai publieur, quel que soit le client qui insère (auth.uid() = la personne
-- connectée ; null pour un script service-role, qui retombe sur l'auteur fourni).
-- ---------------------------------------------------------------------------
create or replace function force_official_post_team_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  team_profile_id constant uuid := '8d736a66-2597-4f48-b70b-08e6f7059c89';
begin
  if new.post_type = 'OFFICIAL'
     and exists (select 1 from profiles where id = team_profile_id) then
    new.published_by := coalesce(auth.uid(), new.published_by, new.author_id);
    new.author_id := team_profile_id;
  end if;
  return new;
end;
$$;

create trigger posts_force_official_team_author
  before insert on posts
  for each row execute function force_official_post_team_author();

-- L'ancienne policy exigeait `author_id = auth.uid()` pour un post officiel :
-- incompatible avec l'auteur d'équipe imposé par le trigger ci-dessus (la
-- vérification RLS porte sur la ligne APRÈS les triggers BEFORE). Le trigger
-- écrase de toute façon l'auteur fourni : seul le rôle admin/modérateur compte.
drop policy if exists posts_insert on posts;

create policy posts_insert on posts
  for insert to authenticated
  with check (
    (post_type = 'PERSONAL' and author_id = auth.uid())
    or (post_type = 'OFFICIAL' and is_admin_or_moderator(auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Les notifications de nouveau post officiel excluent toujours l'auteur ;
-- elles excluent désormais aussi la personne qui a réellement publié (sinon
-- elle serait notifiée de son propre post, l'auteur affiché n'étant plus elle).
-- ---------------------------------------------------------------------------
create or replace function notify_official_post()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.post_type = 'OFFICIAL' and new.category is distinct from 'TEACHING' then
    insert into notifications (recipient_id, actor_id, type, title, body, target_url)
    select id, new.author_id, 'OFFICIAL_POST', 'Nouvelle publication officielle', left(new.content, 140), '/feed'
    from profiles
    where notify_official_posts = true
      and id <> new.author_id
      and id <> coalesce(new.published_by, new.author_id);
  end if;
  return new;
end;
$$;

create or replace function notify_new_resource()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.post_type = 'OFFICIAL' and new.category = 'TEACHING' then
    insert into notifications (recipient_id, actor_id, type, title, body, target_url)
    select id, new.author_id, 'NEW_RESOURCE', 'Nouvel enseignement disponible',
      coalesce(new.title, left(new.content, 140)), '/feed'
    from profiles
    where notify_official_posts = true
      and id <> new.author_id
      and id <> coalesce(new.published_by, new.author_id);
  end if;
  return new;
end;
$$;
