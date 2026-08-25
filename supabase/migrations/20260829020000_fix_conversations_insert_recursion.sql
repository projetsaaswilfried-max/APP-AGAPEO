-- ============================================================================
-- Bug révélé en le testant en réel : `conversations_insert` (20260829010000)
-- fait un `select count(*) from conversations c2 where ...` à l'intérieur de
-- son propre `with check` — cette sous-requête doit elle-même passer par la
-- RLS de `conversations` (dont la policy SELECT), ce qui déclenche une
-- récursion infinie (42P17). Même classe de bug déjà rencontrée et corrigée
-- pour `conversation_participants` (cf. is_conversation_participant,
-- 20260808150000_fix_conversation_participants_recursion.sql) : la solution
-- est d'isoler le comptage dans une fonction SECURITY DEFINER, qui contourne
-- la RLS pour cette seule sous-requête au lieu de la ré-évaluer.
-- ============================================================================

create function count_monthly_invitations(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select count(*)::integer from conversations
  where initiated_by = p_user_id
    and created_at >= date_trunc('month', now());
$$;

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (
      (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
      and (
        (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
        or count_monthly_invitations(auth.uid()) < 10
      )
    )
  );
