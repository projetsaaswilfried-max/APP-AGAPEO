-- ============================================================================
-- La recherche de /admin/users ne portait que sur les membres déjà chargés
-- (lots de 100) — un profil recherché mais pas encore chargé n'apparaissait
-- jamais, même s'il existait bien en base. Cette fonction cherche sur TOUTE
-- la base (prénom, nom, email, pays), indépendamment de ce qui est déjà
-- chargé côté client.
--
-- Même schéma de sécurité que admin_list_users_by_verification_recency :
-- lit auth.users directement pour l'email (jamais exposé via PostgREST
-- sinon), réservée au service_role. IMPORTANT (leçon apprise en réel sur la
-- fonction précédente) : `revoke ... from public` seul ne suffit pas,
-- Supabase accorde EXECUTE directement à authenticated/anon à la création —
-- il faut révoquer explicitement sur les trois.
-- ============================================================================

create or replace function admin_search_users(p_query text, p_limit integer default 50)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  gender gender_type,
  is_test_account boolean,
  country text,
  created_at timestamptz,
  last_active_at timestamptz,
  photo_verification_status verification_status,
  role app_role,
  is_suspended boolean,
  is_premium boolean,
  subscription_plan text
)
language sql
security definer set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    u.email,
    p.gender,
    p.is_test_account,
    p.country,
    p.created_at,
    p.last_active_at,
    p.photo_verification_status,
    coalesce(pr.role, 'USER'::app_role) as role,
    coalesce(pr.is_suspended, false) as is_suspended,
    coalesce(pr.subscription_status = 'ACTIVE', false) as is_premium,
    pr.subscription_plan
  from profiles p
  join auth.users u on u.id = p.id
  left join profile_restricted pr on pr.id = p.id
  where p.first_name ilike '%' || p_query || '%'
     or p.last_name ilike '%' || p_query || '%'
     or (p.first_name || ' ' || p.last_name) ilike '%' || p_query || '%'
     or u.email ilike '%' || p_query || '%'
     or p.country ilike '%' || p_query || '%'
  order by p.created_at desc
  limit p_limit;
$$;

revoke execute on function admin_search_users(text, integer) from public, authenticated, anon;
grant execute on function admin_search_users(text, integer) to service_role;
