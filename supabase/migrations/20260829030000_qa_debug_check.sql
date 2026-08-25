create function qa_debug_conversations_check()
returns boolean
language sql
security invoker
set search_path = public
as $$
  select is_admin_or_moderator(auth.uid())
    or (
      (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
      and (
        (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
        or count_monthly_invitations(auth.uid()) < 10
      )
    );
$$;
