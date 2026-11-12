-- Restitution des jours d'abonnement perdus à attendre la validation du profil.
--
-- Jusqu'à la migration hold_subscription_until_photo_verified, les jours
-- payés s'écoulaient même quand le membre ne pouvait pas s'en servir : la RLS
-- lui refusait l'écriture de messages tant que sa photo n'était pas validée.
-- Cette migration rend ces jours-là à ceux qui les ont perdus.
--
-- Règle retenue, volontairement généreuse et entièrement calculable :
-- pour chaque paiement réussi, on mesure le temps écoulé entre le crédit de
-- l'accès et la première validation de photo (ou maintenant, si le profil
-- n'a jamais été validé), borné à la durée du plan acheté. Les membres ayant
-- perdu au moins UNE journée entière sont crédités, arrondi au jour supérieur.
-- En dessous d'une journée il s'agit du délai normal d'examen par l'équipe,
-- pas d'une perte.
--
-- Mesuré le 2026-11-12 : 65 membres concernés, 477 jours à rendre (406 membres
-- ont perdu quelque chose, mais 341 d'entre eux moins d'une journée).
--
-- Exclus : comptes suspendus, comptes de test et équipe.
--
-- La table `subscription_credits` sert d'écriture comptable : elle évite tout
-- double crédit (contrainte d'unicité sur le motif), garde la trace de ce qui
-- a été rendu et à qui, et pilote l'envoi des emails
-- (scripts/notify-restored-premium-days.ts lit `notified_at`).

create table if not exists public.subscription_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  days numeric(8, 3) not null check (days > 0),
  reason text not null,
  granted_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (user_id, reason)
);

alter table public.subscription_credits enable row level security;
-- Aucune politique : table d'administration, accessible uniquement par la clé
-- de service (scripts et espace d'administration).

create index if not exists subscription_credits_pending_notification_idx
  on public.subscription_credits (notified_at)
  where notified_at is null;

-- 1. Calcul et enregistrement des crédits.
with verif as (
  select user_id, min(reviewed_at) as verifie_le
  from verification_requests
  where status = 'VERIFIED' and reviewed_at is not null
  group by user_id
),
paiements as (
  select
    t.user_id,
    t.premium_granted_at as debut,
    t.premium_granted_at + (case t.plan
      when 'premium_weekly' then interval '7 days'
      when 'premium_half_month' then interval '15 days'
      when 'premium_monthly' then interval '30 days'
      when 'premium_quarterly' then interval '90 days'
      when 'premium_access' then interval '30 days' end) as fin
  from transactions t
  where t.status = 'SUCCEEDED' and t.premium_granted_at is not null and t.plan is not null
),
perdus as (
  select
    p.user_id,
    sum(extract(epoch from (least(p.fin, coalesce(v.verifie_le, now())) - p.debut)) / 86400.0) as jours
  from paiements p
  left join verif v on v.user_id = p.user_id
  where least(p.fin, coalesce(v.verifie_le, now())) > p.debut
  group by p.user_id
)
insert into public.subscription_credits (user_id, days, reason)
select perdus.user_id, ceil(perdus.jours)::numeric, 'verification_delay_2026_11'
from perdus
join profiles p on p.id = perdus.user_id
join profile_restricted pr on pr.id = perdus.user_id
where perdus.jours >= 1
  and coalesce(p.is_test_account, false) = false
  and coalesce(p.is_staff, false) = false
  and coalesce(pr.is_suspended, false) = false
on conflict (user_id, reason) do nothing;

-- 2a. Abonnement en cours mais photo toujours pas validée : le reste de la
--     période ET les jours rendus passent en réserve, le décompte s'arrête là
--     et ne repartira qu'à la validation. (Le déclencheur de mise en réserve
--     ne touche pas cette écriture : il sort dès que l'échéance vaut NULL.)
update public.profile_restricted pr
set subscription_hold_days = round(
      coalesce(pr.subscription_hold_days, 0)
      + greatest(extract(epoch from (pr.subscription_current_period_end - now())) / 86400.0, 0)
      + c.days, 3),
    subscription_current_period_end = null,
    subscription_reminder_stage = null,
    subscription_expired_at = null
from public.subscription_credits c, public.profiles p
where c.user_id = pr.id
  and p.id = pr.id
  and c.reason = 'verification_delay_2026_11'
  and pr.subscription_status = 'ACTIVE'
  and p.photo_verification_status <> 'VERIFIED';

-- 2b. Abonnement en cours et photo validée : l'échéance s'allonge d'autant.
update public.profile_restricted pr
set subscription_current_period_end =
      pr.subscription_current_period_end + make_interval(secs => (c.days * 86400)::double precision),
    subscription_reminder_stage = null
from public.subscription_credits c, public.profiles p
where c.user_id = pr.id
  and p.id = pr.id
  and c.reason = 'verification_delay_2026_11'
  and pr.subscription_status = 'ACTIVE'
  and pr.subscription_current_period_end is not null
  and p.photo_verification_status = 'VERIFIED';

-- 2c. Plus d'abonnement en cours : on rouvre une période de la durée rendue,
--     sur le dernier plan réellement payé. Si la photo n'est toujours pas
--     validée, le déclencheur la bascule aussitôt en réserve.
update public.profile_restricted pr
set subscription_status = 'ACTIVE',
    subscription_plan = coalesce(pr.subscription_plan, dernier.plan),
    subscription_current_period_end = now() + make_interval(secs => (c.days * 86400)::double precision),
    subscription_reminder_stage = null,
    subscription_expired_at = null,
    subscription_expiry_followup_sent = false
from public.subscription_credits c
join lateral (
  select t.plan
  from public.transactions t
  where t.user_id = c.user_id and t.status = 'SUCCEEDED' and t.plan is not null
  order by t.created_at desc
  limit 1
) dernier on true
where c.user_id = pr.id
  and c.reason = 'verification_delay_2026_11'
  and pr.subscription_status <> 'ACTIVE';
