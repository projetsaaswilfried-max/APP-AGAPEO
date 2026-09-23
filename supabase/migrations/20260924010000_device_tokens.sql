-- ============================================================================
-- Notifications push natives (FCM) pour l'app mobile, en plus du Web Push
-- déjà en place (VAPID, `push_subscriptions`) — la même ligne `notifications`
-- déclenche déjà `notify_push_on_notification()` -> `send-push-notification`
-- pour CHAQUE type de notification (message, post officiel, support...) ;
-- cette fonction est étendue (pas ce fichier) pour lire aussi cette table et
-- envoyer via FCM, donc aucun trigger métier n'a besoin d'être modifié.
--
-- `token` est unique globalement (pas juste par utilisateur) : un jeton FCM
-- identifie un appareil, jamais une personne — si quelqu'un se déconnecte et
-- qu'un autre membre se connecte sur le même téléphone, ce même jeton doit
-- pouvoir être réattribué au nouvel utilisateur.
-- ============================================================================

create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index device_tokens_user_id_idx on device_tokens (user_id);

create trigger device_tokens_touch_updated_at
  before update on device_tokens
  for each row execute function touch_updated_at();

alter table device_tokens enable row level security;

create policy device_tokens_select_own on device_tokens
  for select
  to authenticated
  using (user_id = auth.uid());

create policy device_tokens_insert_own on device_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy device_tokens_delete_own on device_tokens
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Pas de policy UPDATE directe : réattribuer un jeton déjà pris par un autre
-- utilisateur (l'appareil a changé de main) exigerait de pouvoir d'abord le
-- SELECT sous RLS (condition Postgres pour ON CONFLICT DO UPDATE), ce qu'on
-- ne veut justement pas ouvrir (un jeton d'un autre membre ne doit jamais
-- être lisible). La RPC ci-dessous, SECURITY DEFINER, sert donc de point
-- d'entrée unique pour l'app mobile — même principe que
-- `create_conversation_with_participant` : `auth.uid()` seul détermine le
-- propriétaire final, jamais une valeur fournie par l'appelant.
create or replace function register_device_token(p_token text, p_platform text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'Plateforme invalide : % (attendu ios ou android).', p_platform;
  end if;
  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'Jeton manquant.';
  end if;

  insert into device_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform;
end;
$$;

-- Postgres accorde EXECUTE à PUBLIC par défaut sur toute nouvelle fonction —
-- retiré explicitement pour qu'un appel anonyme soit rejeté au niveau du
-- privilège lui-même, pas seulement par le contrôle `auth.uid()` ci-dessus.
revoke execute on function register_device_token(text, text) from public;
grant execute on function register_device_token(text, text) to authenticated;
