-- ============================================================================
-- /admin/users chargeait TOUS les membres d'un coup (profiles + profile_restricted
-- + la liste complète des comptes auth pour résoudre les emails) — trois
-- balayages complets de table à chaque ouverture de la page, de plus en plus
-- lent à mesure que la base grossit. Remplacé par un chargement par lots de
-- 100, triés par récence de vérification (les profils récemment validés en
-- premier, ceux jamais soumis tout en bas) plutôt que par date d'inscription.
--
-- Une seule fonction fait tout le travail côté base (jointure + tri + email
-- résolu directement depuis auth.users, jamais exposé via PostgREST sinon) —
-- réservée au service_role : un membre normal ne doit jamais pouvoir
-- l'appeler directement et recevoir la liste de tout le monde.
-- ============================================================================

create or replace function admin_list_users_by_verification_recency(p_limit integer, p_offset integer)
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
  left join lateral (
    select coalesce(vr.reviewed_at, vr.submitted_at) as sort_key
    from verification_requests vr
    where vr.user_id = p.id
    order by coalesce(vr.reviewed_at, vr.submitted_at) desc
    limit 1
  ) latest on true
  order by latest.sort_key desc nulls last, p.created_at desc
  limit p_limit offset p_offset;
$$;

-- IMPORTANT : `revoke ... from public` seul ne suffit PAS ici — Supabase
-- accorde EXECUTE directement aux rôles authenticated/anon à la création
-- d'une fonction dans le schéma public (pas seulement via public en tant que
-- pseudo-rôle). Vérifié en réel : sans ce revoke explicite sur les deux
-- rôles, un membre normal connecté pouvait appeler cette fonction et
-- recevoir la liste complète de tous les autres membres (emails, statuts,
-- abonnements...). Confirmé après correctif : permission denied (42501)
-- pour authenticated ET anon, fonctionne toujours via service_role.
revoke execute on function admin_list_users_by_verification_recency(integer, integer) from public, authenticated, anon;
grant execute on function admin_list_users_by_verification_recency(integer, integer) to service_role;
