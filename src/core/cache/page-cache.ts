/**
 * Mémoire des dernières données affichées par les pages de l'espace membre
 * (le temps de la session de navigation dans l'onglet) : revenir sur une
 * page l'affiche immédiatement avec ce qu'elle montrait, puis la page
 * rafraîchit en arrière-plan. Les clés incluent toujours l'identifiant du
 * membre — aucune donnée ne passe d'un compte à l'autre sur un même appareil.
 */
const store = new Map<string, unknown>();

export function readPageCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function writePageCache<T>(key: string, value: T): void {
  store.set(key, value);
}
