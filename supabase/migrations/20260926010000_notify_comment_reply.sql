-- ============================================================================
-- Notifie désormais aussi l'auteur d'un commentaire quand quelqu'un lui
-- répond — jusqu'ici seul l'auteur du POST était notifié d'un nouveau
-- commentaire (y compris pour une réponse, ce qui reste inchangé). Les deux
-- notifications sont indépendantes : si l'auteur du post est aussi l'auteur
-- du commentaire répondu, il reçoit les deux (rare, chacune reste un fait
-- distinct — pas de déduplication ajoutée).
--
-- `new.author_id` est déjà, à ce stade, réécrit vers le compte d'équipe si
-- le répondant est un membre du staff (trigger BEFORE force_staff_comment_
-- team_author qui s'exécute avant celui-ci) — la notification affiche donc
-- naturellement "Équipe Agapeo a répondu...", sans code spécifique ici.
-- ============================================================================

create or replace function notify_post_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_post posts%rowtype;
  parent_comment post_comments%rowtype;
  commenter_name text;
  wants_notif boolean;
  reply_target_url text;
begin
  select * into target_post from posts where id = new.post_id;

  if target_post.post_type = 'PERSONAL' and target_post.author_id <> new.author_id then
    select notify_comments into wants_notif from profiles where id = target_post.author_id;
    select first_name into commenter_name from profiles where id = new.author_id;

    if wants_notif then
      insert into notifications (recipient_id, actor_id, type, title, body, target_url)
      values (
        target_post.author_id,
        new.author_id,
        'POST_COMMENT',
        commenter_name || ' a commenté votre publication',
        left(new.content, 140),
        '/profile'
      );
    end if;
  end if;

  if new.parent_comment_id is not null then
    select * into parent_comment from post_comments where id = new.parent_comment_id;

    if found and parent_comment.author_id <> new.author_id then
      select notify_comments into wants_notif from profiles where id = parent_comment.author_id;
      select first_name into commenter_name from profiles where id = new.author_id;

      if wants_notif then
        reply_target_url := case when target_post.post_type = 'OFFICIAL' then '/feed' else '/profile/' || target_post.author_id end;

        insert into notifications (recipient_id, actor_id, type, title, body, target_url)
        values (
          parent_comment.author_id,
          new.author_id,
          'POST_COMMENT',
          commenter_name || ' a répondu à votre commentaire',
          left(new.content, 140),
          reply_target_url
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;
