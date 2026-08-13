-- ============================================================================
-- Permet aux membres et au staff de joindre une image à un message de
-- support. Un message peut désormais être une image seule (content vide) ou
-- du texte accompagné d'une image — jamais les deux vides.
-- ============================================================================

alter table support_messages add column attachment_path text;
alter table support_messages add column attachment_mime_type text;

alter table support_messages drop constraint support_messages_content_check;
alter table support_messages add constraint support_messages_content_check
  check (char_length(trim(content)) > 0 or attachment_path is not null);

-- Bucket privé, chemin imposé : support-attachments/{ticket_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Lecture : le membre propriétaire du dossier ou le staff, peu importe le
-- statut (besoin de consulter l'historique d'un dossier déjà clôturé).
create policy support_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or is_admin_or_moderator(auth.uid()))
    )
  );

-- Écriture : même règle que l'insertion des messages — dossier OUVERT
-- uniquement, et seulement le propriétaire (membre) ou le staff.
create policy support_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and exists (
      select 1 from support_tickets t
      where t.id::text = (storage.foldername(name))[1]
        and t.status = 'OPEN'
        and (t.user_id = auth.uid() or is_admin_or_moderator(auth.uid()))
    )
  );
