-- ============================================================================
-- Bug trouvé en revue : `conversations_insert` (20260826000000) exigeait un
-- abonnement Premium actif pour créer une conversation — donc pour envoyer
-- une simple invitation — ce qui contredit la règle voulue : un membre
-- gratuit doit pouvoir envoyer des invitations (limitées), l'abonnement
-- Premium ne doit conditionner que la MESSAGERIE elle-même une fois
-- l'invitation acceptée (déjà correctement géré par `messages_insert`).
--
-- Nouvelle règle : la vérification de profil reste obligatoire pour
-- inviter (comme avant) ; l'abonnement Premium n'est plus requis, mais un
-- membre gratuit est plafonné à 10 invitations envoyées par mois civil —
-- au-delà, seul un abonnement Premium (ou l'équipe) débloque l'envoi
-- illimité. Le comptage porte sur toutes les invitations envoyées ce
-- mois-ci, quelle que soit leur issue (acceptée, refusée, en attente).
-- ============================================================================

drop policy if exists conversations_insert on conversations;

create policy conversations_insert on conversations
  for insert to authenticated
  with check (
    is_admin_or_moderator(auth.uid())
    or (
      (select photo_verification_status from profiles where id = auth.uid()) = 'VERIFIED'
      and (
        (select subscription_status from profile_restricted where id = auth.uid()) = 'ACTIVE'
        or (
          select count(*) from conversations c2
          where c2.initiated_by = auth.uid()
            and c2.created_at >= date_trunc('month', now())
        ) < 10
      )
    )
  );
