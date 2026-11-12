-- Le décompte des jours d'abonnement ne démarre qu'à la validation de la photo.
--
-- Un membre qui paie alors que son profil n'est pas encore validé (jamais
-- soumis, en attente de l'équipe, ou refusé) ne peut pas se servir du cœur de
-- l'abonnement : la RLS lui refuse l'écriture de messages tant que
-- `photo_verification_status` n'est pas VERIFIED. Jusqu'ici ses jours
-- s'écoulaient quand même — il payait une semaine et pouvait en perdre
-- l'essentiel à attendre une validation qui ne dépendait pas de lui. Mesuré le
-- 2026-11-12 : 65 membres ont ainsi perdu au moins une journée entière, 477
-- jours en tout.
--
-- Nouveau fonctionnement : les jours achetés sont MIS EN RÉSERVE
-- (`subscription_hold_days`) au lieu d'être posés sur une échéance.
-- L'abonnement reste ACTIVE — le membre a payé, il garde l'accès qu'il a —
-- mais sans échéance qui court. À la validation de la photo, la réserve
-- devient une échéance classique et le décompte démarre.
--
-- Pourquoi `subscription_current_period_end` passe à NULL pendant la réserve
-- plutôt qu'à une date lointaine : les deux requêtes du cron d'expiration
-- comparent cette colonne (`lt`, `lte`/`gt`), et une comparaison avec NULL
-- n'est jamais vraie. Un membre en réserve est donc naturellement ignoré par
-- la rétrogradation ET par les relances d'échéance, sans toucher au cron.
--
-- La réserve ne se constitue qu'au MOMENT du crédit d'un paiement. Un membre
-- dont la photo est validée et dont le décompte a démarré ne repasse jamais en
-- réserve, même si sa photo est ensuite supprimée ou invalidée — sans quoi il
-- suffirait de retirer sa photo pour figer son abonnement indéfiniment.

alter table public.profile_restricted
  add column if not exists subscription_hold_days numeric(8, 3);

comment on column public.profile_restricted.subscription_hold_days is
  'Jours payés mis en réserve parce que la photo n''est pas validée : le décompte démarre à la validation (cf. start_subscription_on_photo_verified). NULL = le décompte court normalement.';

-- ACTIVE exige toujours un plan, et désormais SOIT une échéance qui court,
-- SOIT une réserve en attente de validation.
alter table public.profile_restricted
  drop constraint if exists active_requires_plan_and_period_end;

alter table public.profile_restricted
  add constraint active_requires_plan_and_period_end check (
    subscription_status <> 'ACTIVE'
    or (
      subscription_plan is not null
      and (subscription_current_period_end is not null or subscription_hold_days is not null)
    )
  );

alter table public.profile_restricted
  drop constraint if exists subscription_hold_days_positive;

alter table public.profile_restricted
  add constraint subscription_hold_days_positive check (subscription_hold_days is null or subscription_hold_days > 0);

-- Mise en réserve, à chaque crédit de paiement, quel que soit le chemin :
-- webhooks Chariow/SasPay/Stripe, les trois crons de réconciliation, le
-- sondage de la modale Mobile Money, ou un octroi manuel depuis l'espace
-- d'administration. Un déclencheur en base est le seul endroit qui les couvre
-- tous — l'app mobile écrit elle aussi directement dans Supabase.
create or replace function public.hold_subscription_until_photo_verified()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_photo verification_status;
  v_base timestamptz;
  v_granted_days numeric;
  v_existing_hold numeric := 0;
begin
  if new.subscription_status <> 'ACTIVE' or new.subscription_current_period_end is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Seule une EXTENSION de période signale un paiement crédité : une
    -- modification d'un autre champ (étape de relance, suspension…) laisse
    -- l'échéance telle quelle et ne doit rien déplacer.
    if old.subscription_status = 'ACTIVE'
       and old.subscription_current_period_end is not null
       and new.subscription_current_period_end <= old.subscription_current_period_end then
      return new;
    end if;
    v_base := greatest(coalesce(old.subscription_current_period_end, now()), now());
    v_existing_hold := coalesce(old.subscription_hold_days, 0);
  else
    v_base := now();
  end if;

  select photo_verification_status into v_photo from profiles where id = new.id;
  if v_photo = 'VERIFIED' then
    return new;
  end if;

  v_granted_days := extract(epoch from (new.subscription_current_period_end - v_base)) / 86400.0;
  if v_granted_days <= 0 then
    return new;
  end if;

  new.subscription_hold_days := round(v_existing_hold + v_granted_days, 3);
  new.subscription_current_period_end := null;
  -- Rien à relancer ni à expirer tant que le décompte n'a pas commencé.
  new.subscription_reminder_stage := null;
  new.subscription_expired_at := null;
  return new;
end;
$$;

drop trigger if exists profile_restricted_hold_until_verified on public.profile_restricted;
create trigger profile_restricted_hold_until_verified
  before insert or update on public.profile_restricted
  for each row
  execute function public.hold_subscription_until_photo_verified();

-- Démarrage du décompte à la validation de la photo.
create or replace function public.start_subscription_on_photo_verified()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.photo_verification_status = 'VERIFIED'
     and old.photo_verification_status is distinct from new.photo_verification_status then
    update profile_restricted
    set subscription_current_period_end = now() + make_interval(secs => (subscription_hold_days * 86400)::double precision),
        subscription_hold_days = null,
        subscription_reminder_stage = null,
        subscription_expired_at = null,
        subscription_expiry_followup_sent = false
    where id = new.id
      and subscription_hold_days is not null;
  end if;
  return new;
end;
$$;

-- `OF photo_verification_status` : ce déclencheur ne s'exécute que lorsque
-- cette colonne précise fait partie de la mise à jour. Il ne peut donc pas
-- être rappelé par la synchronisation de `is_premium`, qui ne touche qu'elle.
drop trigger if exists profiles_start_subscription_on_verified on public.profiles;
create trigger profiles_start_subscription_on_verified
  after update of photo_verification_status on public.profiles
  for each row
  execute function public.start_subscription_on_photo_verified();
