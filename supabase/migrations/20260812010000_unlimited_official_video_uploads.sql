-- Le fil officiel doit pouvoir accueillir des vidéos sans limite de taille
-- (demande explicite de l'équipe éditoriale). `post-media` est le bucket
-- partagé publications officielles + publications personnelles ; on retire
-- son plafond ici plutôt que de dupliquer un bucket, ce qui bénéficie aussi
-- aux publications personnelles sans que cela ait été explicitement demandé
-- contre elles. `file_size_limit = null` = aucune limite appliquée par la
-- policy du bucket ; le plafond réel restant celui du plan Supabase (upload
-- direct non-résumable — au-delà de quelques Go, un upload résumable (TUS)
-- serait nécessaire, non couvert ici).
update storage.buckets set file_size_limit = null where id = 'post-media';
