"use client";

import { useEffect } from "react";

const STORAGE_PREFIX = "agapeo:scroll:";

/**
 * Mémorisation manuelle de la position de scroll, en complément (pas en
 * remplacement) de la restauration automatique de Next.js — celle-ci s'est
 * révélée peu fiable ici à cause de l'animation de transition de page
 * (AnimatePresence mode="wait" dans AppShell) qui retarde le montage de la
 * nouvelle page après une navigation "back", brouillant le moment où
 * Next.js applique sa propre restauration.
 *
 * À appeler juste avant de naviguer vers une page où l'utilisateur
 * s'attend à "revenir" ensuite (ex: cloche de notifications) : mémorise la
 * position de scroll de la page courante, restaurée automatiquement au
 * prochain montage de cette même page via `useRestoreScrollMemory`.
 */
export function saveScrollForCurrentPage() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${window.location.pathname}`, String(window.scrollY));
}

/** Restaure (une seule fois) la position de scroll mémorisée pour `pathname`, si elle existe. */
export function useRestoreScrollMemory(pathname: string) {
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved === null) return;
    sessionStorage.removeItem(key);

    const y = Number(saved);
    if (!Number.isFinite(y)) return;

    // Laisse le temps à l'animation de transition de page (~200ms, cf.
    // AppShell) de finir de monter le contenu avant de scroller, sinon la
    // page n'a pas encore sa hauteur finale.
    const timeout = setTimeout(() => {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }, 320);
    return () => clearTimeout(timeout);
  }, [pathname]);
}
