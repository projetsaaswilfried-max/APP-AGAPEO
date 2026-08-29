-- ============================================================================
-- Les photos ajoutées PENDANT l'onboarding (avant la toute première
-- soumission pour vérification) atterrissaient immédiatement dans la file de
-- modération de l'équipe (PENDING) dès l'upload — avant même que la personne
-- ait fini de remplir son profil, voire jamais soumis. Nouveau statut DRAFT :
-- privé au propriétaire comme PENDING, mais exclu de la file de modération
-- tant qu'il n'a pas été promu en PENDING par submitVerificationRequestAction,
-- au moment réel de la soumission (cf. migration suivante).
--
-- `ALTER TYPE ... ADD VALUE` ne peut pas être utilisée dans la même
-- transaction qu'une DDL qui référence la nouvelle valeur (ex: une policy
-- RLS) — cette migration ne fait donc que déclarer la valeur ; son usage
-- arrive dans la migration suivante.
-- ============================================================================

alter type photo_moderation_status add value 'DRAFT';
