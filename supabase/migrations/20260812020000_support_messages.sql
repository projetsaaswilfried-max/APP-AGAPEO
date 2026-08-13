-- ============================================================================
-- Support : fil de discussion unique par membre avec l'équipe (pas un système
-- de tickets multiples — un seul historique continu, comme demandé). Chaque
-- ligne est soit un message du membre (is_staff = false), soit une réponse de
-- l'équipe (is_staff = true, author_id = le membre du staff qui a répondu).
-- ============================================================================

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  is_staff boolean not null default false,
  content text not null check (char_length(trim(content)) > 0),
  -- "Lu par le destinataire" : le staff pour un message membre, le membre
  -- pour une réponse du staff — jamais l'auteur lui-même.
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index support_messages_user_idx on support_messages (user_id, created_at);
create index support_messages_unread_staff_idx on support_messages (created_at) where not is_staff and not is_read;

alter table support_messages enable row level security;

create policy support_messages_select on support_messages
  for select to authenticated
  using (user_id = auth.uid() or is_admin_or_moderator(auth.uid()));

create policy support_messages_insert on support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      (not is_staff and user_id = auth.uid())
      or (is_staff and is_admin_or_moderator(auth.uid()))
    )
  );

-- Autorise la mise à jour de la ligne (nécessaire pour marquer `is_read`),
-- mais un trigger interdit ci-dessous de modifier autre chose que ce champ —
-- même logique que `guard_message_update()` pour la messagerie normale.
create policy support_messages_update on support_messages
  for update to authenticated
  using (user_id = auth.uid() or is_admin_or_moderator(auth.uid()))
  with check (user_id = auth.uid() or is_admin_or_moderator(auth.uid()));

create function guard_support_message_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id
    or new.author_id <> old.author_id
    or new.is_staff <> old.is_staff
    or new.content <> old.content then
    raise exception 'Seul le statut de lecture peut être modifié après envoi';
  end if;
  return new;
end;
$$;

create trigger support_messages_guard_update
  before update on support_messages
  for each row execute function guard_support_message_update();
