-- ============================================================================
-- Correctif : `protect_privileged_profile_columns()` bloquait à tort les
-- mises à jour système (ex: `sync_email_verified` déclenché par la
-- confirmation d'email côté Supabase Auth, ou toute opération via la clé
-- service_role) car `auth.uid()` y est NULL — la fonction ne testait que
-- le rôle admin/modérateur, pas le contexte système.
--
-- Un `auth.uid()` NULL sur cette table ne peut provenir que d'un contexte
-- de confiance (trigger SECURITY DEFINER ou service_role qui contourne la
-- RLS) : la policy `profiles_update_own` impose déjà `id = auth.uid()`,
-- donc un utilisateur normal authentifié ne peut jamais atteindre ce
-- trigger avec un `auth.uid()` NULL.
-- ============================================================================

create or replace function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Modification du rôle non autorisée';
  end if;
  if new.email_verified is distinct from old.email_verified
    or new.phone_verified is distinct from old.phone_verified
    or new.photo_verification_status is distinct from old.photo_verification_status then
    raise exception 'Modification des statuts de vérification non autorisée';
  end if;

  return new;
end;
$$;
