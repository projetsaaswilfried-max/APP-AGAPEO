-- ============================================================================
-- Support des messages automatiques "Agapeo" dans la messagerie : message de
-- bienvenue à la vérification du profil, puis relances Premium tous les 2
-- jours sur 30 jours, à sens unique (le membre peut lire mais pas répondre).
-- Envoyés exclusivement via le client service-role (createAdminClient,
-- cf. src/lib/agapeo-system-message.ts) — aucune policy RLS n'est modifiée
-- ici, exactement comme openReportConversationAction avant.
-- ============================================================================

alter table conversations add column is_system_broadcast boolean not null default false;

alter table profile_restricted add column in_app_premium_nudge_stage integer;
