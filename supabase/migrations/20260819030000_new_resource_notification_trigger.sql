-- Notification dédiée "nouvelle ressource" pour les publications officielles
-- de catégorie TEACHING (Enseignements), avec un message plus engageant que
-- la notification générique. On redéfinit notify_official_post() pour
-- exclure TEACHING de son périmètre (évite d'envoyer DEUX notifications —
-- la générique et la dédiée — pour la même publication) ; toutes les autres
-- catégories continuent de déclencher la notification générique inchangée.
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
    where notify_official_posts = true and id <> new.author_id;
  end if;
  return new;
end;
$$;

create function notify_new_resource()
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
    where notify_official_posts = true and id <> new.author_id;
  end if;
  return new;
end;
$$;

create trigger posts_notify_new_resource
  after insert on posts
  for each row execute function notify_new_resource();
