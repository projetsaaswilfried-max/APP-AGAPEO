"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "agapeo_ios_install_dismissed_at";
// Redemande après 30 jours plutôt que de ne plus jamais réapparaître —
// laisse une chance à quelqu'un qui aurait fermé la bannière par réflexe.
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * iOS (contrairement à Android/Chrome) n'expose aucune API pour déclencher
 * l'installation par code — impossible de proposer un vrai bouton
 * "Installer". Ce hook détecte seulement qui PEUT réellement suivre la
 * manip manuelle (Partager → Sur l'écran d'accueil) : un iPhone/iPad, dans
 * Safari, pas déjà lancé depuis l'écran d'accueil, et pas déjà ignoré
 * récemment — les composants d'affichage (dashboard, landing) le
 * réutilisent tel quel.
 */
export function useIosInstallPrompt() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (!isIos || !isSafari) return;

    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) return;
    } catch {
      // Stockage indisponible (navigation privée...) — on affiche quand même la bannière.
    }

    setShouldShow(true);
  }, []);

  const dismiss = () => {
    setShouldShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Best-effort — pas grave si ça ne persiste pas.
    }
  };

  return { shouldShow, dismiss };
}
