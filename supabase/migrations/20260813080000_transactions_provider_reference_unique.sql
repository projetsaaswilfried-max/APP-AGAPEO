-- Idempotence des webhooks de paiement : Chariow relivre un même évènement
-- jusqu'à 5 fois si notre endpoint ne répond pas 2xx assez vite. Une
-- contrainte unique sur (provider, provider_reference) permet un upsert sûr
-- côté webhook — un retry ne crée jamais deux transactions pour une même vente.
alter table transactions add constraint transactions_provider_reference_unique
  unique (provider, provider_reference);
