/**
 * Compte réel `profiles` (marqué `is_staff`, donc automatiquement masqué de
 * Découvrir/favoris/likes comme tout compte d'équipe) servant d'expéditeur
 * aux messages automatiques envoyés au nom d'Agapeo dans la messagerie —
 * message de bienvenue à la vérification, relances Premium tous les 2 jours.
 * Cf. src/lib/agapeo-system-message.ts. Le même UUID est dupliqué en dur
 * dans supabase/functions/activation-email-sequences/index.ts (les imports
 * `@/...` n'existent pas côté Edge Function Deno).
 */
export const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";
