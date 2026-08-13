-- ============================================================================
-- Supabase Storage — buckets & policies
--
-- Conventions de chemin (imposées et vérifiées par les policies, pas
-- seulement par convention côté client) :
--   avatars/{user_id}/{filename}
--   post-media/{user_id}/{post_id}/{filename}
--   message-attachments/{conversation_id}/{filename}   (bucket PRIVÉ)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post-media', 'post-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('message-attachments', 'message-attachments', false, 26214400, null);

-- ----------------------------------------------------------------------------
-- avatars (public en lecture, écriture réservée à son propre dossier)
-- ----------------------------------------------------------------------------
create policy avatars_public_read on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- post-media (public en lecture, écriture réservée à son propre dossier)
-- ----------------------------------------------------------------------------
create policy post_media_public_read on storage.objects
  for select
  using (bucket_id = 'post-media');

create policy post_media_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy post_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- message-attachments (privé — réservé aux participants de la conversation)
-- ----------------------------------------------------------------------------
create policy message_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id::text = (storage.foldername(name))[1]
        and cp.user_id = auth.uid()
    )
  );

create policy message_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id::text = (storage.foldername(name))[1]
        and cp.user_id = auth.uid()
    )
  );
