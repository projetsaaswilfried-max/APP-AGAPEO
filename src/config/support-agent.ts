/**
 * Interrupteur de l'assistant de support.
 *
 * Volontairement FERMÉ par défaut. L'assistant ne peut pas répondre sans
 * crédits sur le compte Anthropic, et dans ce cas la route transmet chaque
 * demande à l'équipe par email : laisser le bouton visible à 22 000 membres
 * avant que tout soit prêt inonderait la boîte support au lieu de la soulager.
 *
 * Pour l'ouvrir : `NEXT_PUBLIC_SUPPORT_AGENT_ENABLED=true` côté Vercel (et
 * dans `.env.local` pour tester en local). Tant qu'il est fermé, l'aide
 * continue de pointer vers WhatsApp, exactement comme avant.
 *
 * Lu via `NEXT_PUBLIC_` parce que le bandeau et la page d'aide en ont besoin
 * dans le navigateur ; la clé API, elle, ne sort jamais du serveur.
 */
export const IS_SUPPORT_AGENT_ENABLED = process.env.NEXT_PUBLIC_SUPPORT_AGENT_ENABLED === "true";
