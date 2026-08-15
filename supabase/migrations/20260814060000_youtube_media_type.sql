-- Nouveau type de media pour les publications officielles : video YouTube
-- integree (pas de rehebergement du fichier). posts.video_url stocke
-- l'identifiant de la video YouTube (pas l'URL complete) quand
-- media_type = 'YOUTUBE' ; posts.video_thumbnail stocke l'URL de la
-- vignette officielle YouTube (img.youtube.com), deja publique et gratuite.
alter type post_media_type add value 'YOUTUBE';
