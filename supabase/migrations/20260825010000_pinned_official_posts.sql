-- Épinglage des vidéos du fil officiel : les vidéos épinglées passent en tête
-- du fil, dans un ordre explicitement choisi par l'équipe (pinned_position),
-- indépendamment de leur date de publication. NULL = non épinglée.
alter table posts add column is_pinned boolean not null default false;
alter table posts add column pinned_position int;

create index posts_pinned_idx on posts (post_type, pinned_position) where is_pinned;
