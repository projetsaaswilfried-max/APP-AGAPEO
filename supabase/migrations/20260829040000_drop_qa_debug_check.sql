-- Fonction de diagnostic temporaire (débogage de la récursion RLS sur
-- conversations_insert) — jamais utilisée par l'application, supprimée
-- après vérification.
drop function if exists qa_debug_conversations_check();
