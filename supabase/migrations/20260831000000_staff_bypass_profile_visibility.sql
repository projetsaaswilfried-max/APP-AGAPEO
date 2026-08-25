-- ============================================================================
-- Bug rapporté : dans l'espace admin, "Voir le profil" renvoyait
-- "Profil introuvable" pour certains membres alors que leur profil existe
-- bien. Cause : /profile/[id]/page.tsx exempte déjà l'équipe (staff) de la
-- règle "profil vérifié uniquement", mais cette exemption ne sert à rien si
-- la LIGNE elle-même n'est jamais chargée — `profiles_select` ne laissait
-- passer que : sa propre ligne, ou un profil ni invisible ni bloqué. Un
-- membre qui a activé "Profil invisible" (paramètre de confidentialité) ou
-- qui a bloqué/été bloqué par l'admin devenait donc invisible même pour la
-- modération. Même lacune sur profile_photos_select (galerie vide) et
-- posts_select (publications personnelles vides) pour la même raison.
-- ============================================================================

drop policy if exists profiles_select on profiles;

create policy profiles_select on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or is_admin_or_moderator(auth.uid())
    or (not is_invisible_profile and not is_blocked(auth.uid(), id))
  );

drop policy if exists profile_photos_select on profile_photos;

create policy profile_photos_select on profile_photos
  for select to authenticated
  using (
    profile_id = auth.uid()
    or is_admin_or_moderator(auth.uid())
    or (
      moderation_status = 'APPROVED'
      and exists (
        select 1 from profiles p
        where p.id = profile_photos.profile_id
          and not p.is_invisible_profile and not is_blocked(auth.uid(), p.id)
      )
    )
  );

drop policy if exists posts_select on posts;

create policy posts_select on posts
  for select to authenticated
  using (
    post_type = 'OFFICIAL'
    or author_id = auth.uid()
    or is_admin_or_moderator(auth.uid())
    or not is_blocked(auth.uid(), author_id)
  );
