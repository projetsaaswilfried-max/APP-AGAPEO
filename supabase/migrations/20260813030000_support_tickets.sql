-- ============================================================================
-- Support : passage d'un fil unique continu par membre à un vrai système de
-- dossiers (tickets) avec objet, statut, et clôture. Un membre ouvre un
-- dossier (objet + premier message), peut recevoir des réponses tant qu'il
-- est ouvert, et plus aucun message n'est possible une fois clôturé — il
-- faut alors ouvrir un nouveau dossier pour un nouveau sujet.
-- ============================================================================

create type support_ticket_status as enum ('OPEN', 'CLOSED');

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  subject text not null check (char_length(trim(subject)) > 0),
  status support_ticket_status not null default 'OPEN',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references profiles (id) on delete set null
);

-- Un seul dossier ouvert à la fois par membre — un nouveau sujet attend la
-- clôture du précédent (ou réutilise le même dossier, ce qui est le but).
create unique index support_tickets_one_open_per_user on support_tickets (user_id) where status = 'OPEN';
create index support_tickets_open_queue_idx on support_tickets (last_message_at desc) where status = 'OPEN';
create index support_tickets_user_idx on support_tickets (user_id, created_at desc);

alter table support_tickets enable row level security;

create policy support_tickets_select on support_tickets
  for select to authenticated
  using (user_id = auth.uid() or is_admin_or_moderator(auth.uid()));

create policy support_tickets_insert_own on support_tickets
  for insert to authenticated
  with check (user_id = auth.uid());

create policy support_tickets_update on support_tickets
  for update to authenticated
  using (user_id = auth.uid() or is_admin_or_moderator(auth.uid()))
  with check (user_id = auth.uid() or is_admin_or_moderator(auth.uid()));

-- Seule transition autorisée après création : OPEN -> CLOSED (par le membre
-- ou le staff). Pas de réouverture, pas de changement d'objet a posteriori.
create function guard_support_ticket_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id or new.subject <> old.subject then
    raise exception 'Seule la clôture du dossier est autorisée après sa création';
  end if;
  if old.status = 'CLOSED' then
    raise exception 'Ce dossier est déjà clôturé';
  end if;
  if new.status = 'CLOSED' and old.status = 'OPEN' then
    new.closed_at := coalesce(new.closed_at, now());
    new.closed_by := coalesce(new.closed_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger support_tickets_guard_update
  before update on support_tickets
  for each row execute function guard_support_ticket_update();

-- Tient `last_message_at` à jour pour trier la file d'attente admin par
-- activité récente, sans requête supplémentaire côté application.
create function touch_support_ticket_last_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update support_tickets set last_message_at = new.created_at where id = new.ticket_id;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- support_messages : rattachement à un dossier plutôt qu'à un membre "en vrac"
-- ----------------------------------------------------------------------------
alter table support_messages add column ticket_id uuid references support_tickets (id) on delete cascade;

-- Migration des messages existants (s'il y en a) : un dossier "Support" par
-- membre ayant déjà écrit, statut ouvert, pour ne perdre aucun historique.
insert into support_tickets (user_id, subject, status, created_at)
select distinct user_id, 'Support', 'OPEN'::support_ticket_status, now()
from support_messages
where ticket_id is null
on conflict do nothing;

update support_messages sm
set ticket_id = t.id
from support_tickets t
where sm.ticket_id is null and t.user_id = sm.user_id and t.status = 'OPEN';

alter table support_messages alter column ticket_id set not null;

create index support_messages_ticket_idx on support_messages (ticket_id, created_at);

create trigger support_messages_touch_ticket
  after insert on support_messages
  for each row execute function touch_support_ticket_last_message();

-- Remplace les anciennes policies (basées sur user_id seul) par des policies
-- qui vérifient aussi que le dossier ciblé est bien ouvert.
drop policy if exists support_messages_insert on support_messages;

create policy support_messages_insert on support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id
        and t.status = 'OPEN'
        and (
          (not support_messages.is_staff and t.user_id = auth.uid())
          or (support_messages.is_staff and is_admin_or_moderator(auth.uid()))
        )
    )
  );

-- Ouvre un dossier + son premier message en une seule transaction (évite un
-- dossier orphelin sans message si le deuxième insert échouait côté client).
create function open_support_ticket(p_subject text, p_message text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_ticket_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;

  insert into support_tickets (user_id, subject) values (auth.uid(), trim(p_subject)) returning id into new_ticket_id;
  insert into support_messages (ticket_id, user_id, author_id, is_staff, content)
  values (new_ticket_id, auth.uid(), auth.uid(), false, trim(p_message));

  return new_ticket_id;
end;
$$;
