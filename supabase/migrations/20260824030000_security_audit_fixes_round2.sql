-- ============================================================================
-- Deuxième vague d'audit de sécurité — quatre policies laissaient un membre
-- écrire des colonnes qui n'auraient dû être fixées que côté serveur/admin.
-- Aucune de ces failles ne permettait d'obtenir un droit qu'un membre gratuit
-- ne devrait jamais avoir (paiement, accès staff réel) mais chacune permettait
-- de fausser un état censé être fiable (file d'attente de vérification,
-- historique de support, file de modération).
-- ============================================================================

-- 1) verification_requests : seul user_id était contraint à l'insertion — un
-- membre pouvait insérer directement une ligne avec status='VERIFIED' (faux
-- historique de validation), is_priority=true (double file d'attente
-- prioritaire sans payer), ou reviewed_at/reviewed_by renseignés (usurpation
-- d'une revue admin qui n'a jamais eu lieu). Ces colonnes ne doivent être
-- écrites que par le flux applicatif normal (valeurs par défaut à la
-- soumission) ou par le client service_role (décision admin).
drop policy if exists verification_requests_insert_own on verification_requests;

create policy verification_requests_insert_own on verification_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'PENDING'
    and reviewed_at is null
    and reviewed_by is null
  );

-- 2) support_messages : l'insertion vérifiait que l'auteur (author_id) et le
-- dossier ciblé appartenaient bien à l'appelant, mais jamais que la colonne
-- `user_id` de la ligne insérée correspondait réellement au propriétaire du
-- dossier — un membre pouvait donc insérer un message dans SON PROPRE dossier
-- ouvert tout en y indiquant l'UUID d'un autre membre comme `user_id`, rendant
-- ce message visible par ce tiers via support_messages_select (qui se fie à
-- cette colonne).
drop policy if exists support_messages_insert on support_messages;

create policy support_messages_insert on support_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from support_tickets t
      where t.id = support_messages.ticket_id
        and t.status = 'OPEN'
        and t.user_id = support_messages.user_id
        and (
          (not support_messages.is_staff and t.user_id = auth.uid())
          or (support_messages.is_staff and is_admin_or_moderator(auth.uid()))
        )
    )
  );

-- 3) reports : `status` n'était pas contraint à l'insertion — un signalant
-- pouvait créer son propre signalement déjà marqué DISMISSED/ACTION_TAKEN,
-- le rendant invisible dans la file de modération filtrée sur PENDING.
drop policy if exists reports_insert on reports;

create policy reports_insert on reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'PENDING');

-- 4) profiles.is_test_account n'était pas couvert par
-- protect_privileged_profile_columns() (qui ne bloquait que
-- email_verified/phone_verified/photo_verification_status/is_staff/is_premium) —
-- un membre pouvait donc se marquer lui-même is_test_account=true pour
-- s'exclure discrètement de toutes les campagnes/relances email (weekly-digest,
-- send-scheduled-campaigns, activation-email-sequences filtrent tous dessus),
-- ou l'inverse pour un vrai compte de test qui voudrait forcer sa présence
-- dans ces envois.
create or replace function protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or is_admin_or_moderator(auth.uid()) then
    return new;
  end if;

  if new.email_verified is distinct from old.email_verified
    or new.phone_verified is distinct from old.phone_verified
    or new.photo_verification_status is distinct from old.photo_verification_status
    or new.is_staff is distinct from old.is_staff
    or new.is_premium is distinct from old.is_premium
    or new.is_test_account is distinct from old.is_test_account then
    raise exception 'Modification des statuts de vérification/badges non autorisée';
  end if;

  return new;
end;
$$;
