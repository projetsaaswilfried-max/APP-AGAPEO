-- Marque les comptes fictifs créés pour la démo/QA (Discover, messagerie,
-- notes vocales) afin de pouvoir les identifier et les supprimer en un seul
-- DELETE avant le lancement réel, sans risquer de toucher un vrai membre.
alter table profiles add column is_test_account boolean not null default false;

create index profiles_is_test_account_idx on profiles (is_test_account) where is_test_account;
