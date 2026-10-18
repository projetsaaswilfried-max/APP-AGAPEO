import type { DiscoverFilterCriteria } from "@/domain/types/discover";
import type { FeedCategory } from "@/domain/types/feed";

/**
 * Point d'entrée unique pour toutes les clés React Query de l'app — évite
 * les fautes de frappe entre l'endroit où une clé est lue (useQuery) et
 * l'endroit où elle doit être invalidée/mise à jour après une mutation
 * (queryClient.setQueryData/invalidateQueries), qui sont souvent dans des
 * fichiers différents. Toujours préfixées par l'id du membre connecté :
 * aucune donnée ne doit pouvoir être lue depuis le cache d'un autre compte
 * sur le même appareil (changement de session = clés totalement différentes).
 */
export const queryKeys = {
  discover: (userId: string, filters: DiscoverFilterCriteria, page: number) =>
    ["discover", userId, filters, page] as const,
  feed: (userId: string, category: FeedCategory) => ["feed", userId, category] as const,
  conversations: (userId: string) => ["conversations", userId] as const,
  notifications: (userId: string) => ["notifications", userId] as const,
  profile: (profileId: string) => ["profile", profileId] as const
};
