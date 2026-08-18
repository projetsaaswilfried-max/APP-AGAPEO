alter table post_comments
  add column parent_comment_id uuid references post_comments (id) on delete cascade;

create index post_comments_parent_comment_id_idx on post_comments (parent_comment_id);
