-- ============================================================================
-- Modifier / supprimer un commentaire (jusqu'ici seule la suppression était
-- possible, et uniquement via l'admin/le propriétaire du post — pas de
-- suppression ni de modification côté membre lui-même).
--
-- La suppression existe déjà (`post_comments_delete` : auteur, propriétaire
-- du post, ou équipe) et n'est pas touchée ici.
--
-- La modification est réservée au véritable auteur — jamais le propriétaire
-- du post ni l'équipe : supprimer un commentaire choquant relève de la
-- modération, le réécrire à la place de son auteur non. `commented_by`
-- (cf. force_staff_comment_team_author) permet à un membre de l'équipe de
-- modifier son propre commentaire même si celui-ci s'affiche sous "Équipe
-- Agapeo" (author_id réécrit) — sans ça il ne pourrait plus jamais éditer
-- ses propres mots.
-- ============================================================================

alter table post_comments add column updated_at timestamptz not null default now();

create trigger post_comments_touch_updated_at
  before update on post_comments
  for each row execute function touch_updated_at();

-- Seul `content` (et `updated_at`, mis à jour par le trigger ci-dessus) peut
-- changer — jamais l'appartenance du commentaire (post, auteur, réponse à
-- quoi) ni sa date de création.
create or replace function protect_post_comment_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.post_id is distinct from old.post_id
    or new.author_id is distinct from old.author_id
    or new.parent_comment_id is distinct from old.parent_comment_id
    or new.commented_by is distinct from old.commented_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Seul le contenu d''un commentaire peut être modifié.';
  end if;
  return new;
end;
$$;

create trigger post_comments_protect_fields
  before update on post_comments
  for each row execute function protect_post_comment_fields();

create policy post_comments_update_own on post_comments
  for update
  to authenticated
  using (author_id = auth.uid() or commented_by = auth.uid())
  with check (author_id = auth.uid() or commented_by = auth.uid());
