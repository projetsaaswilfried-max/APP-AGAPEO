declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Déclenche un évènement Meta Pixel standard. No-op silencieux si le script n'est pas chargé (pixel non configuré, ou appelé côté serveur). */
export function trackMetaEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", eventName, params);
}

/**
 * Comme `trackMetaEvent`, mais garantit un seul envoi par `dedupeKey`, même
 * après un remontage du composant (rechargement de page, retour arrière) —
 * utilisé pour les évènements de conversion (CompleteRegistration, Purchase)
 * qui ne doivent jamais compter deux fois la même personne/le même achat.
 *
 * `dedupeKey` sert aussi d'`eventID` Meta : le même évènement est aussi
 * envoyé côté serveur via la Conversions API (trigger handle_new_user pour
 * CompleteRegistration, webhook Chariow pour Purchase) avec ce même
 * identifiant — Meta déduplique alors les deux au lieu de compter deux fois
 * la même conversion.
 */
export function trackMetaEventOnce(eventName: string, dedupeKey: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const storageKey = `agapeo:fbq:${eventName}:${dedupeKey}`;
  try {
    if (localStorage.getItem(storageKey)) return;
    window.fbq?.("track", eventName, params, { eventID: dedupeKey });
    localStorage.setItem(storageKey, "1");
  } catch {
    // Navigation privée / stockage bloqué : on envoie quand même l'évènement,
    // simplement sans garantie de déduplication dans ce cas rare.
    window.fbq?.("track", eventName, params, { eventID: dedupeKey });
  }
}
