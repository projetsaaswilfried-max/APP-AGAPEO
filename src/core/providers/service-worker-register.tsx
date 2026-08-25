"use client";

import { useEffect } from "react";

/**
 * Enregistré globalement (avant, seulement depuis la page des notifications
 * push) — sans ça, PWABuilder ne détectait aucun service worker actif, et un
 * abonnement push existant pouvait ne pas être repris tant qu'on ne
 * revisitait pas cette page précise après un redémarrage de l'appli.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort : l'app fonctionne normalement sans service worker actif.
    });
  }, []);

  return null;
}
