-- ============================================================================
-- Vérification par selfie live : en plus des photos déjà postées, le membre
-- doit désormais prendre un selfie en direct (caméra, jamais un import de
-- fichier) au moment de soumettre son profil pour vérification. L'équipe
-- compare ce selfie aux photos déjà postées avant de valider — empêche
-- quelqu'un de poster les photos d'une autre personne (influenceur, photo
-- trouvée en ligne) et de se faire "vérifier" sans jamais montrer son vrai
-- visage en direct.
-- ============================================================================

alter table verification_requests add column selfie_storage_path text;

-- Bucket privé, chemin imposé : verification-selfies/{user_id}/{filename}
-- Jamais public : ce n'est ni un avatar ni un contenu à montrer aux autres
-- membres, seulement une pièce de comparaison pour l'équipe de modération.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-selfies', 'verification-selfies', false, 15728640, array['image/jpeg', 'image/png', 'image/webp']);

create policy verification_selfies_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-selfies' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lecture : le membre propriétaire (pour se relire) ou le staff (pour comparer).
create policy verification_selfies_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-selfies'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin_or_moderator(auth.uid()))
  );
