-- ============================================================================
-- Taux de change quotidiens (base XOF) pour convertir automatiquement le prix
-- FCFA de référence des plans Premium vers la devise locale du pays Mobile
-- Money choisi par le client (SasPay facture dans la devise du pays, pas
-- systématiquement en FCFA — cf. src/config/saspay-networks.ts). Alimentée
-- par le cron refresh-fx-rates (source : open.er-api.com, gratuite, sans
-- clé, mise à jour ~1x/jour) — jamais calculée à la volée pendant un paiement
-- réel pour ne pas dépendre d'un service externe dans ce chemin critique.
-- ============================================================================
create table fx_rates (
  currency_code text primary key,
  xof_rate numeric not null,
  updated_at timestamptz not null default now()
);

alter table fx_rates enable row level security;
-- Verrouillée par défaut, comme `transactions` — lecture uniquement via le
-- client service_role (src/lib/fx-rates.ts, refresh-fx-rates).
