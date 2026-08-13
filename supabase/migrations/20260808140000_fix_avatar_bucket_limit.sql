-- ============================================================================
-- Correctif : le bucket `avatars` limitait les fichiers à 8 Mo côté serveur
-- alors que la validation cliente (`validateImageFile`) acceptait jusqu'à
-- 15 Mo — toute photo entre 8 et 15 Mo passait la validation cliente puis
-- échouait silencieusement à l'upload (erreur générique affichée).
-- On aligne le bucket sur la limite cliente.
-- ============================================================================

update storage.buckets
set file_size_limit = 15728640 -- 15 Mo
where id = 'avatars';
