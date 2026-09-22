-- ============================================================================
-- Toute action visible publiquement d'un membre de l'équipe (SUPER_ADMIN,
-- ADMIN, MODERATOR) est désormais signée "Équipe Agapeo", avec le même badge
-- bleu que les publications officielles — pas seulement les publications
-- (cf. 20260921010000_official_posts_team_author.sql), mais aussi les
-- commentaires (et réponses, même table) qu'un membre de l'équipe poste sur
-- N'IMPORTE QUEL post, personnel ou officiel.
--
-- Même schéma que pour les posts : `commented_by` garde la trace de qui a
-- réellement écrit (accountabilité interne, modération), `author_id` est
-- réécrit vers le compte d'équipe par un trigger BEFORE INSERT — donc valable
-- pour tous les clients (web, mobile, scripts), pas seulement l'affichage web.
-- ============================================================================

alter table post_comments add column commented_by uuid references profiles(id) on delete set null;

-- Backfill : les commentaires déjà postés par un membre de l'équipe en son nom propre sont réattribués.
update post_comments
   set commented_by = author_id
 where author_id in (select id from profile_restricted where role in ('ADMIN', 'SUPER_ADMIN', 'MODERATOR'))
   and author_id <> '8d736a66-2597-4f48-b70b-08e6f7059c89';

update post_comments
   set author_id = '8d736a66-2597-4f48-b70b-08e6f7059c89'
 where commented_by is not null
   and exists (select 1 from profiles where id = '8d736a66-2597-4f48-b70b-08e6f7059c89');

create or replace function force_staff_comment_team_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  team_profile_id constant uuid := '8d736a66-2597-4f48-b70b-08e6f7059c89';
begin
  if auth.uid() is not null
     and is_admin_or_moderator(auth.uid())
     and exists (select 1 from profiles where id = team_profile_id) then
    new.commented_by := coalesce(new.commented_by, auth.uid());
    new.author_id := team_profile_id;
  end if;
  return new;
end;
$$;

create trigger post_comments_force_team_author
  before insert on post_comments
  for each row execute function force_staff_comment_team_author();

-- L'ancienne policy exigeait author_id = auth.uid() : incompatible avec
-- l'auteur d'équipe imposé ci-dessus pour un membre du staff (le contrôle RLS
-- porte sur la ligne APRÈS les triggers BEFORE). Le trigger écrase de toute
-- façon l'auteur fourni : seul le rôle admin/modérateur compte dans ce cas.
drop policy if exists post_comments_insert on post_comments;

create policy post_comments_insert on post_comments
  for insert to authenticated
  with check (
    (author_id = auth.uid() or is_admin_or_moderator(auth.uid()))
    and exists (
      select 1 from posts p
      where p.id = post_comments.post_id
        and (p.post_type = 'OFFICIAL' or not is_blocked(auth.uid(), p.author_id))
    )
  );
