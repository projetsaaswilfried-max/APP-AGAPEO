-- Espace admin : suspension de compte (pilotage réel, pas juste visuel).
-- Les mutations de rôle/suspension/vérification passent par le client
-- service_role côté serveur (cf. admin.actions.ts), pas par une policy RLS
-- élargie sur `profiles` — la table reste verrouillée en écriture à
-- "chacun sa propre ligne" pour tout le reste de l'application.
alter table profiles add column is_suspended boolean not null default false;
alter table profiles add column suspended_at timestamptz;
alter table profiles add column suspended_reason text;

create index profiles_is_suspended_idx on profiles (is_suspended) where is_suspended;
