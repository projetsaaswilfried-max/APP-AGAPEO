/**
 * Compte réel `profiles` "Équipe Agapeo" (marqué `is_staff`, donc automatiquement
 * masqué de Découvrir/favoris/likes comme tout compte d'équipe). Deux usages :
 *  - expéditeur des messages automatiques dans la messagerie — message de
 *    bienvenue à la vérification, relances Premium tous les 2 jours
 *    (cf. src/lib/agapeo-system-message.ts) ;
 *  - auteur de toutes les publications officielles : imposé par le trigger
 *    `posts_force_official_team_author` (supabase/migrations/20260921010000_…),
 *    pour que l'app mobile, qui lit `posts.author_id` brut, affiche l'équipe
 *    et non la personne qui a publié (celle-ci reste dans `posts.published_by`).
 * Le même UUID est dupliqué en dur dans supabase/functions/activation-email-sequences/index.ts
 * (les imports `@/...` n'existent pas côté Edge Function Deno) et dans la migration ci-dessus.
 */
export const AGAPEO_SYSTEM_PROFILE_ID = "8d736a66-2597-4f48-b70b-08e6f7059c89";
