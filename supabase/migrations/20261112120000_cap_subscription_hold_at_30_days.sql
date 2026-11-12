-- Plafond de 30 jours sur la mise en réserve des jours d'abonnement.
--
-- La migration hold_subscription_until_photo_verified gèle le décompte tant
-- que la photo n'est pas validée. Sans limite, un membre qui ne fait jamais
-- valider son profil garderait son accès Premium gelé indéfiniment. Décision
-- du fondateur le 2026-11-12 : la réserve dure au maximum 30 jours, après
-- quoi le décompte démarre de lui-même.
--
-- Le compteur part de la PREMIÈRE mise en réserve et ne se réarme pas à chaque
-- nouveau paiement : sans quoi il suffirait de racheter avant l'échéance pour
-- rester gelé sans fin. Il est remis à zéro uniquement quand la réserve est
-- consommée (validation de la photo, ou libération automatique ici).

alter table public.profile_restricted
  add column if not exists subscription_hold_started_at timestamptz;

comment on column public.profile_restricted.subscription_hold_started_at is
  'Début de la mise en réserve des jours (cf. subscription_hold_days). Le décompte démarre de lui-même 30 jours après cette date si la photo n''est toujours pas validée.';

-- Les réserves déjà constituées (restitution du 2026-11-12) partent d'aujourd'hui :
-- leurs titulaires ont été prévenus par email le jour même, ils ont donc bien
-- leurs 30 jours pleins pour faire valider leur profil.
update public.profile_restricted
set subscription_hold_started_at = now()
where subscription_hold_days is not null and subscription_hold_started_at is null;

alter table public.profile_restricted
  drop constraint if exists subscription_hold_has_start;

alter table public.profile_restricted
  add constraint subscription_hold_has_start check (
    (subscription_hold_days is null) = (subscription_hold_started_at is null)
  );

-- Le déclencheur de mise en réserve horodate le début, et respecte désormais
-- un laissez-passer de transaction : la libération automatique ci-dessous doit
-- pouvoir poser une échéance sur un profil NON validé sans que la réserve se
-- reconstitue aussitôt. Même idiome que
-- `agapeo.bypass_privileged_columns_guard`.
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
  if current_setting('agapeo.bypass_subscription_hold', true) = 'on' then
    return new;
  end if;

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
  -- Le plafond court depuis la PREMIÈRE mise en réserve, jamais réarmé par un
  -- nouveau paiement.
  new.subscription_hold_started_at := coalesce(
    case when tg_op = 'UPDATE' then old.subscription_hold_started_at end,
    now()
  );
  -- Rien à relancer ni à expirer tant que le décompte n'a pas commencé.
  new.subscription_reminder_stage := null;
  new.subscription_expired_at := null;
  return new;
end;
$$;

-- La validation de la photo consomme la réserve : l'horodatage repart à zéro.
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
        subscription_hold_started_at = null,
        subscription_reminder_stage = null,
        subscription_expired_at = null,
        subscription_expiry_followup_sent = false
    where id = new.id
      and subscription_hold_days is not null;
  end if;
  return new;
end;
$$;

-- Libération automatique au bout de 30 jours : le décompte démarre, le membre
-- garde l'intégralité des jours qu'il a payés. Rien n'est perdu, la réserve
-- cesse simplement d'être gelée.
create or replace function public.release_expired_subscription_holds()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_released integer;
begin
  -- Laissez-passer local à la transaction : sans lui, le déclencheur de mise
  -- en réserve remettrait aussitôt ces jours en réserve, puisque la photo
  -- n'est toujours pas validée.
  perform set_config('agapeo.bypass_subscription_hold', 'on', true);

  with liberes as (
    update profile_restricted
    set subscription_current_period_end = now() + make_interval(secs => (subscription_hold_days * 86400)::double precision),
        subscription_hold_days = null,
        subscription_hold_started_at = null,
        subscription_reminder_stage = null,
        subscription_expired_at = null,
        subscription_expiry_followup_sent = false
    where subscription_hold_days is not null
      and subscription_hold_started_at <= now() - interval '30 days'
    returning id
  )
  select count(*) into v_released from liberes;

  perform set_config('agapeo.bypass_subscription_hold', 'off', true);
  return v_released;
end;
$$;

revoke all on function public.release_expired_subscription_holds() from public;

-- Toutes les heures : le plafond se compte en jours, cette granularité suffit
-- largement et ne coûte rien (une seule requête sur un index partiel).
create index if not exists profile_restricted_hold_started_idx
  on public.profile_restricted (subscription_hold_started_at)
  where subscription_hold_days is not null;

select cron.unschedule('release-subscription-holds-hourly')
where exists (select 1 from cron.job where jobname = 'release-subscription-holds-hourly');

select cron.schedule(
  'release-subscription-holds-hourly',
  '7 * * * *',
  $$ select public.release_expired_subscription_holds(); $$
);
